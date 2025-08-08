import { logger, ensureError, MessageFilter } from '@starbunk/shared';
import { Message } from 'discord.js';
import { ReplyBotImpl } from './bot-builder';
import { shouldExcludeFromReplyBots } from './conditions';
import { v4 as uuidv4 } from 'uuid';

interface BotProcessResult {
	bot: string;
	triggered: boolean;
	error?: Error;
}

interface CircuitBreakerState {
	failures: number;
	lastFailure: number;
	state: 'closed' | 'open' | 'half-open';
	lastSuccess: number;
}

export class MessageProcessor {
	private circuitBreakers = new Map<string, CircuitBreakerState>();
	private readonly maxFailures = 3;
	private readonly resetTimeout = 60000; // 1 minute
	private readonly halfOpenMaxAttempts = 1;

	constructor(
		private messageFilter: MessageFilter,
		private replyBots: ReplyBotImpl[] = []
	) {}

	async processMessage(message: Message): Promise<void> {
		const correlationId = uuidv4();
		
		logger.debug(`Processing message ${correlationId}`, {
			messageId: message.id,
			author: message.author.username,
			channelId: message.channel.id
		});

		if (!this.shouldProcessMessage(message)) return;

		try {
			const context = MessageFilter.createContextFromMessage(message);
			const filterResult = this.messageFilter.shouldProcessMessage(context);
			
			if (!filterResult.allowed) {
				logger.debug(`Message filtered: ${filterResult.reason}`, { correlationId });
				return;
			}

			await this.processWithReplyBots(message, correlationId);
		} catch (error) {
			logger.error('Error processing message:', ensureError(error), { correlationId });
		}
	}

	private shouldProcessMessage(message: Message): boolean {
		if (!message?.author) return false;

		if (message.author.bot) {
			const shouldExclude = shouldExcludeFromReplyBots(message);
			if (shouldExclude) {
				logger.debug(`Bot message excluded: ${message.author.username}`);
				return false;
			}
		}

		return true;
	}

	private async processWithReplyBots(message: Message, correlationId: string): Promise<void> {
		if (this.replyBots.length === 0) {
			logger.debug('No reply bots loaded - skipping processing', { correlationId });
			return;
		}

		// Filter bots by circuit breaker state
		const availableBots = this.replyBots.filter(bot => !this.isCircuitOpen(bot.name));
		
		if (availableBots.length === 0) {
			logger.warn('All bots have open circuit breakers - message processing skipped', { correlationId });
			return;
		}

		logger.debug(`Processing with ${availableBots.length}/${this.replyBots.length} available bots`, { correlationId });

		const results = await Promise.allSettled(
			availableBots.map(bot => this.processBotResponse(bot, message, correlationId))
		);

		this.logProcessingResults(results, correlationId);
	}

	private async processBotResponse(bot: ReplyBotImpl, message: Message, correlationId: string): Promise<BotProcessResult> {
		try {
			const shouldRespond = await bot.shouldRespond(message);
			if (shouldRespond) {
				await bot.processMessage(message);
				this.recordSuccess(bot.name);
				return { bot: bot.name, triggered: true };
			}
			return { bot: bot.name, triggered: false };
		} catch (error) {
			const processedError = ensureError(error);
			logger.error(`Error in bot ${bot.name}:`, processedError, { correlationId });
			
			this.recordFailure(bot.name);
			return { bot: bot.name, triggered: false, error: processedError };
		}
	}

	private logProcessingResults(results: PromiseSettledResult<BotProcessResult>[], correlationId: string): void {
		const triggered = [];
		const failed = [];
		
		for (const result of results) {
			if (result.status === 'fulfilled') {
				if (result.value.triggered) {
					triggered.push(result.value.bot);
				}
				if (result.value.error) {
					failed.push(result.value.bot);
				}
			} else {
				logger.error('Bot processing promise rejected:', result.reason, { correlationId });
			}
		}

		if (triggered.length > 0) {
			logger.debug(`Bots triggered: ${triggered.join(', ')}`, { correlationId });
		}
		
		if (failed.length > 0) {
			logger.warn(`Bots with errors: ${failed.join(', ')}`, { correlationId });
		}
	}

	private isCircuitOpen(botName: string): boolean {
		const breaker = this.circuitBreakers.get(botName);
		if (!breaker) return false;
		
		if (breaker.state === 'open') {
			// Check if we should transition to half-open
			if (Date.now() - breaker.lastFailure > this.resetTimeout) {
				breaker.state = 'half-open';
				logger.info(`Circuit breaker transitioning to half-open for bot: ${botName}`);
				return false;
			}
			return true;
		}
		
		return false;
	}

	private recordFailure(botName: string): void {
		const breaker = this.circuitBreakers.get(botName) || {
			failures: 0,
			lastFailure: 0,
			state: 'closed' as const,
			lastSuccess: Date.now()
		};
		
		breaker.failures++;
		breaker.lastFailure = Date.now();
		
		if (breaker.failures >= this.maxFailures && breaker.state === 'closed') {
			breaker.state = 'open';
			logger.warn(`Circuit breaker opened for bot: ${botName} (${breaker.failures} failures)`);
		} else if (breaker.state === 'half-open') {
			// Failed during half-open, go back to open
			breaker.state = 'open';
			logger.warn(`Circuit breaker reopened for bot: ${botName}`);
		}
		
		this.circuitBreakers.set(botName, breaker);
	}

	private recordSuccess(botName: string): void {
		const breaker = this.circuitBreakers.get(botName);
		if (breaker) {
			if (breaker.state === 'half-open' || breaker.state === 'open') {
				// Success during half-open or recovery from open, close the circuit
				breaker.state = 'closed';
				breaker.failures = 0;
				logger.info(`Circuit breaker closed for bot: ${botName} (recovered)`);
			}
			breaker.lastSuccess = Date.now();
			this.circuitBreakers.set(botName, breaker);
		}
	}

	getCircuitBreakerStatus(): Record<string, CircuitBreakerState> {
		const status: Record<string, CircuitBreakerState> = {};
		for (const [botName, state] of this.circuitBreakers.entries()) {
			status[botName] = { ...state };
		}
		return status;
	}

	updateBots(bots: ReplyBotImpl[]): void {
		this.replyBots = bots;
		logger.debug(`Updated with ${bots.length} reply bots`);
		
		// Clean up circuit breakers for bots that no longer exist
		const botNames = new Set(bots.map(bot => bot.name));
		for (const breakerName of this.circuitBreakers.keys()) {
			if (!botNames.has(breakerName)) {
				this.circuitBreakers.delete(breakerName);
				logger.debug(`Removed circuit breaker for removed bot: ${breakerName}`);
			}
		}
	}
}