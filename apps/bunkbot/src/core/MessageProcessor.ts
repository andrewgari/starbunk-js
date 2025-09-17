import {
	logger,
	ensureError,
	MessageFilter,
	getMetrics,
	getStructuredLogger,
	MessageFlowMetrics,
	getChannelActivityTracker,
	type BunkBotMetrics,
	Enhanced_BunkBotMetricsCollector,
	BotTriggerTracker,
	type MessageContext,
} from '@starbunk/shared';
import { Message } from 'discord.js';
import { ReplyBotImpl, type BotTriggerResult } from './bot-builder';
import { shouldExcludeFromReplyBots } from './conditions';
import { v4 as uuidv4 } from 'uuid';

// Helper function to safely get channel name
function getChannelName(message: Message): string {
	if ('name' in message.channel && message.channel.name) {
		return message.channel.name;
	}
	return message.channel.type === 1 ? 'dm' : 'unknown';
}

interface BotProcessResult {
	bot: string;
	triggered: boolean;
	error?: Error;
	responseText?: string;
	responseLatency?: number;
	skipReason?: string;
	conditionName?: string;
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
	private bunkBotMetrics?: BunkBotMetrics;
	private enhancedMetrics?: Enhanced_BunkBotMetricsCollector;
	private triggerTracker?: BotTriggerTracker;

	constructor(
		private messageFilter: MessageFilter,
		private replyBots: ReplyBotImpl[] = [],
		bunkBotMetrics?: BunkBotMetrics,
		enhancedMetrics?: Enhanced_BunkBotMetricsCollector,
		triggerTracker?: BotTriggerTracker,
	) {
		this.bunkBotMetrics = bunkBotMetrics;
		this.enhancedMetrics = enhancedMetrics;
		this.triggerTracker = triggerTracker;
	}

	async processMessage(message: Message): Promise<void> {
		const correlationId = uuidv4();
		const startTime = Date.now();

		logger.debug(`Processing message ${correlationId}`, {
			messageId: message.id,
			author: message.author.username,
			channelId: message.channel.id,
		});

		// Track message processing start with BunkBot-specific metrics
		if (this.bunkBotMetrics) {
			this.bunkBotMetrics.trackMessageProcessingStart(message.id, this.replyBots.length);
		}

		// Track message received
		try {
			const structuredLogger = getStructuredLogger();
			structuredLogger.logMessageFlow({
				event: 'message_received',
				bot_name: 'system',
				message_text: message.content,
				user_id: message.author.id,
				user_name: message.author.username,
				channel_id: message.channel.id,
				channel_name: getChannelName(message),
				guild_id: message.guild?.id || 'dm',
			});

			// Track channel activity
			const channelTracker = getChannelActivityTracker();
			channelTracker.trackMessage(message);
		} catch (error) {
			logger.warn('Failed to log message flow or track channel activity:', ensureError(error));
		}

		let triggeredBots = 0;

		if (!this.shouldProcessMessage(message)) {
			this.trackMessageSkip(message, 'bot_exclusion', correlationId);
			this.completeMessageProcessing(message.id, triggeredBots, startTime);
			return;
		}

		try {
			const context = MessageFilter.createContextFromMessage(message);
			const filterResult = this.messageFilter.shouldProcessMessage(context);

			if (!filterResult.allowed) {
				this.trackMessageSkip(message, filterResult.reason || 'unknown', correlationId);
				logger.debug(`Message filtered: ${filterResult.reason || 'unknown'}`, { correlationId });
				this.completeMessageProcessing(message.id, triggeredBots, startTime);
				return;
			}

			triggeredBots = await this.processWithReplyBots(message, correlationId);
			this.completeMessageProcessing(message.id, triggeredBots, startTime);
		} catch (error) {
			logger.error('Error processing message:', ensureError(error), { correlationId });
			this.trackMessageError(message, error, correlationId);
			this.completeMessageProcessing(message.id, triggeredBots, startTime);
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

	private async processWithReplyBots(message: Message, correlationId: string): Promise<number> {
		if (this.replyBots.length === 0) {
			logger.debug('No reply bots loaded - skipping processing', { correlationId });
			return 0;
		}

		// Filter bots by circuit breaker state
		const availableBots = this.replyBots.filter((bot) => !this.isCircuitOpen(bot.name));

		if (availableBots.length === 0) {
			logger.warn('All bots have open circuit breakers - message processing skipped', { correlationId });
			return 0;
		}

		logger.debug(`Processing with ${availableBots.length}/${this.replyBots.length} available bots`, {
			correlationId,
		});

		const results = await Promise.allSettled(
			availableBots.map((bot) => this.processBotResponse(bot, message, correlationId)),
		);

		const triggeredCount = this.logProcessingResults(results, correlationId);
		return triggeredCount;
	}

	private async processBotResponse(
		bot: ReplyBotImpl,
		message: Message,
		correlationId: string,
	): Promise<BotProcessResult> {
		const startTime = Date.now();

		// Create message context for enhanced metrics
		const messageContext: MessageContext = {
			messageId: message.id,
			userId: message.author.id,
			username: message.author.username,
			channelId: message.channel.id,
			channelName: getChannelName(message),
			guildId: message.guild?.id || 'dm',
			messageLength: message.content.length,
			timestamp: Date.now(),
		};

		try {
			// Check if bot should respond with detailed trigger information
			let shouldRespond: boolean;
			let triggerResult: BotTriggerResult | undefined;
			let conditionName = 'unknown';

			// Use enhanced interface if available for detailed condition tracking
			if (bot.shouldRespondWithDetails) {
				triggerResult = await bot.shouldRespondWithDetails(message);
				shouldRespond = triggerResult.triggered;
				conditionName = triggerResult.conditionName || 'unknown';
			} else {
				// Fallback to standard interface
				shouldRespond = await bot.shouldRespond(message);
			}

			const responseLatency = Date.now() - startTime;

			if (shouldRespond) {
				// Track bot trigger with enhanced metrics (with condition name)
				if (this.triggerTracker) {
					this.triggerTracker.trackTrigger(bot.name, conditionName, messageContext);
				}

				// Track bot trigger with legacy BunkBot metrics (fallback)
				if (this.bunkBotMetrics) {
					this.bunkBotMetrics.trackBotTrigger(bot.name, conditionName, messageContext);
				}

				// Bot triggered - process the message
				const response = await bot.processMessage(message);
				const totalLatency = Date.now() - startTime;

				this.recordSuccess(bot.name);

				// Track bot response with enhanced metrics
				if (this.triggerTracker) {
					this.triggerTracker.trackResponse(
						bot.name,
						conditionName,
						totalLatency,
						messageContext,
						true,
						'message'
					);
				}

				// Track bot response with legacy BunkBot metrics (fallback)
				if (this.bunkBotMetrics) {
					this.bunkBotMetrics.trackBotResponse(bot.name, conditionName, totalLatency, messageContext);
				}

				// Track successful bot interaction (existing metrics)
				this.trackBotInteraction(message, bot.name, {
					triggered: true,
					responseLatency: totalLatency,
					responseText: typeof response === 'string' ? response : undefined,
					correlationId,
				});

				return {
					bot: bot.name,
					triggered: true,
					responseLatency: totalLatency,
					responseText: typeof response === 'string' ? response : undefined,
				};
			} else {
				// Track bot skip with enhanced metrics
				if (this.enhancedMetrics) {
					this.enhancedMetrics.trackBotSkip(bot.name, 'condition_not_met', messageContext);
				}

				// Track bot skip with legacy BunkBot metrics (fallback)
				if (this.bunkBotMetrics) {
					this.bunkBotMetrics.trackBotSkip(bot.name, 'condition_not_met', messageContext);
				}

				// Bot didn't trigger
				this.trackBotInteraction(message, bot.name, {
					triggered: false,
					skipReason: 'condition_not_met',
					responseLatency,
					correlationId,
				});

				return {
					bot: bot.name,
					triggered: false,
					skipReason: 'condition_not_met',
					responseLatency,
				};
			}
		} catch (error) {
			const processedError = ensureError(error);
			const responseLatency = Date.now() - startTime;

			logger.error(`Error in bot ${bot.name}:`, processedError, { correlationId });

			this.recordFailure(bot.name);

			// Track bot skip due to error with enhanced metrics
			if (this.enhancedMetrics) {
				this.enhancedMetrics.trackBotSkip(bot.name, 'processing_error', messageContext);
			}

			// Track bot skip due to error with legacy BunkBot metrics (fallback)
			if (this.bunkBotMetrics) {
				this.bunkBotMetrics.trackBotSkip(bot.name, 'processing_error', messageContext);
			}

			// Track bot error
			this.trackBotInteraction(message, bot.name, {
				triggered: false,
				error: processedError,
				responseLatency,
				correlationId,
			});

			return {
				bot: bot.name,
				triggered: false,
				error: processedError,
				responseLatency,
			};
		}
	}

	private logProcessingResults(results: PromiseSettledResult<BotProcessResult>[], correlationId: string): number {
		const triggered = [];
		const failed = [];

		for (const _result of results) {
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

		return triggered.length;
	}

	private completeMessageProcessing(messageId: string, triggeredBots: number, startTime: number): void {
		if (this.bunkBotMetrics) {
			const processingTime = Date.now() - startTime;
			this.bunkBotMetrics.trackMessageProcessingComplete(messageId, triggeredBots, processingTime);
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

	private trackMessageSkip(message: Message, reason: string, _correlationId: string): void {
		try {
			const structuredLogger = getStructuredLogger();
			structuredLogger.logMessageFlow({
				event: 'bot_skipped',
				bot_name: 'system',
				message_text: message.content,
				user_id: message.author.id,
				user_name: message.author.username,
				channel_id: message.channel.id,
				channel_name: getChannelName(message),
				guild_id: message.guild?.id || 'dm',
				skip_reason: reason,
			});
		} catch (error) {
			logger.warn('Failed to track message skip:', ensureError(error));
		}
	}

	private trackMessageError(message: Message, error: unknown, _correlationId: string): void {
		try {
			const structuredLogger = getStructuredLogger();
			structuredLogger.logMessageFlow({
				event: 'bot_error',
				bot_name: 'system',
				message_text: message.content,
				user_id: message.author.id,
				user_name: message.author.username,
				channel_id: message.channel.id,
				channel_name: getChannelName(message),
				guild_id: message.guild?.id || 'dm',
				error_message: ensureError(error).message,
			});
		} catch (logError) {
			logger.warn('Failed to track message error:', ensureError(logError));
		}
	}

	private trackBotInteraction(
		message: Message,
		botName: string,
		details: {
			triggered: boolean;
			responseLatency?: number;
			responseText?: string;
			skipReason?: string;
			error?: Error;
			correlationId: string;
		},
	): void {
		try {
			const metrics = getMetrics();
			const structuredLogger = getStructuredLogger();

			const baseMetrics: MessageFlowMetrics = {
				botName,
				messageText: message.content,
				userId: message.author.id,
				userName: message.author.username,
				channelId: message.channel.id,
				channelName: getChannelName(message),
				guildId: message.guild?.id || 'dm',
				triggered: details.triggered,
				responseText: details.responseText,
				responseLatency: details.responseLatency,
				skipReason: details.skipReason,
				circuitBreakerOpen: this.isCircuitOpen(botName),
				timestamp: Date.now(),
			};

			// Track metrics
			metrics.trackMessageFlow(baseMetrics);

			// Log structured data
			const event = details.error ? 'bot_error' : details.triggered ? 'bot_responded' : 'bot_skipped';

			structuredLogger.logMessageFlow({
				event,
				bot_name: botName,
				message_text: message.content,
				user_id: message.author.id,
				user_name: message.author.username,
				channel_id: message.channel.id,
				channel_name: getChannelName(message),
				guild_id: message.guild?.id || 'dm',
				response_text: details.responseText,
				response_latency_ms: details.responseLatency,
				skip_reason: details.skipReason,
				circuit_breaker_open: this.isCircuitOpen(botName),
				error_message: details.error?.message,
			});
		} catch (error) {
			logger.warn('Failed to track bot interaction:', ensureError(error));
		}
	}

	private recordFailure(botName: string): void {
		const breaker = this.circuitBreakers.get(botName) || {
			failures: 0,
			lastFailure: 0,
			state: 'closed' as const,
			lastSuccess: Date.now(),
		};

		breaker.failures++;
		breaker.lastFailure = Date.now();

		if (breaker.failures >= this.maxFailures && breaker.state === 'closed') {
			breaker.state = 'open';
			logger.warn(`Circuit breaker opened for bot: ${botName} (${breaker.failures} failures)`);

			// Track circuit breaker activation in base metrics
			try {
				const metrics = getMetrics();
				metrics.trackCircuitBreakerActivation(botName, `${breaker.failures}_failures`);
			} catch (error) {
				logger.warn('Failed to track circuit breaker activation:', ensureError(error));
			}

			// Track circuit breaker state in BunkBot metrics
			if (this.bunkBotMetrics) {
				this.bunkBotMetrics.trackCircuitBreakerState(botName, 'open', breaker.failures);
			}
		} else if (breaker.state === 'half-open') {
			// Failed during half-open, go back to open
			breaker.state = 'open';
			logger.warn(`Circuit breaker reopened for bot: ${botName}`);

			try {
				const metrics = getMetrics();
				metrics.trackCircuitBreakerActivation(botName, 'half_open_failure');
			} catch (error) {
				logger.warn('Failed to track circuit breaker reactivation:', ensureError(error));
			}

			// Track circuit breaker state in BunkBot metrics
			if (this.bunkBotMetrics) {
				this.bunkBotMetrics.trackCircuitBreakerState(botName, 'open', breaker.failures);
			}
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

				// Track circuit breaker recovery in BunkBot metrics
				if (this.bunkBotMetrics) {
					this.bunkBotMetrics.trackCircuitBreakerState(botName, 'closed', 0);
				}
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
		const botNames = new Set(bots.map((bot) => bot.name));
		for (const breakerName of this.circuitBreakers.keys()) {
			if (!botNames.has(breakerName)) {
				this.circuitBreakers.delete(breakerName);
				logger.debug(`Removed circuit breaker for removed bot: ${breakerName}`);
			}
		}

		// Update enhanced metrics with new bot count
		if (this.enhancedMetrics) {
			this.enhancedMetrics.trackBotRegistryUpdate(0, 0, bots.length); // Full update
		}
	}

	// Add method to get trigger tracker for external access
	getTriggerTracker(): BotTriggerTracker | undefined {
		return this.triggerTracker;
	}
}
