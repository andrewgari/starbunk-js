import {
	logger,
	container,
	ServiceId,
	type CovaBotMetrics,
	getBotResponseLogger,
	type BotResponseLog,
	inferTriggerCondition,
} from '@starbunk/shared';
import { DiscordService } from '../services/discord-service';
import { Message, TextChannel } from 'discord.js';
import { BotIdentity } from '../types/bot-identity';
import { TriggerResponse } from '../types/trigger-response';

/**
 * Mock Message class for web testing (non-Discord usage)
 */
export class MockMessage {
	public content: string;
	public author: { id: string; bot: boolean };
	public mentions: { has: (userId: string) => boolean };
	public guild: { id: string } | null;
	public channel: { send: (content: string) => Promise<void>; id: string };
	public client: { user: { id: string } | null };
	public channelId: string;

	constructor(content: string, authorId: string = 'web-user', isBot: boolean = false) {
		this.content = content;
		this.author = { id: authorId, bot: isBot };
		this.mentions = { has: () => false }; // No mentions in web testing
		this.guild = null; // No guild context for web testing
		this.channelId = 'web-channel';
		this.channel = {
			send: async () => {},
			id: this.channelId,
		}; // No-op for web testing
		this.client = { user: null }; // No client user for web testing
	}
}

/**
 * Configuration interface for CovaBot
 */
export interface CovaBotConfig {
	name: string;
	description: string;
	defaultIdentity: BotIdentity;
	triggers: TriggerResponse[];
	defaultResponseRate?: number;
	skipBotMessages?: boolean;
	disabled?: boolean;
}

/**
 * CovaBot implementation with proper Discord identity resolution
 * Uses server-specific nicknames and avatars from Discord API
 */
export class CovaBot {
	private readonly config: CovaBotConfig;
	private discordService: DiscordService | null = null;
	private metrics?: CovaBotMetrics;

	constructor(config: CovaBotConfig, metrics?: CovaBotMetrics) {
		this.config = {
			defaultResponseRate: 100,
			skipBotMessages: true,
			disabled: false,
			...config,
		};
		this.metrics = metrics;
		// Defer resolving DiscordService until first use to avoid requiring tests to register it
		this.discordService = null;
	}

	get name(): string {
		return this.config.name;
	}

	get description(): string {
		return this.config.description;
	}

	get metadata() {
		return {
			responseRate: this.config.defaultResponseRate || 100,
			disabled: this.config.disabled || false,
		};
	}

	private shouldSkipDueToResponseRate(): boolean {
		const responseRate = this.config.defaultResponseRate || 100;

		if (responseRate <= 0) {
			logger.debug('[CovaBot] Skipping message due to response rate');
			return true;
		}

		if (responseRate < 100) {
			const randomValue = Math.random() * 100;
			if (randomValue >= responseRate) {
				logger.debug('[CovaBot] Skipping message due to response rate');
				return true;
			}
		}

		return false;
	}

	/**
	 * Process web message for testing (non-Discord)
	 * Returns the bot's response as a string instead of sending via Discord
	 */
	async processWebMessage(content: string): Promise<string | null> {
		try {
			// Create mock message for web testing
			const mockMessage = new MockMessage(content);

			// Check if bot is disabled
			if (this.config.disabled) {
				logger.debug('[CovaBot] Bot is disabled, skipping message');
				return null;
			}

			if (this.shouldSkipDueToResponseRate()) {
				return null;
			}

			// Sort triggers by priority (highest first)
			const sortedTriggers = [...this.config.triggers].sort((a, b) => (b.priority || 0) - (a.priority || 0));

			logger.debug(`[CovaBot] Processing ${sortedTriggers.length} triggers for web message: "${content}"`);

			// Process triggers in priority order
			for (const trigger of sortedTriggers) {
				try {
					// Check if trigger condition matches
					const matches = await trigger.condition(mockMessage as unknown as Message);
					logger.debug(`[CovaBot] Trigger "${trigger.name}" condition result: ${matches}`);

					if (!matches) continue;

					// Get response text
					const responseText = await trigger.response(mockMessage as unknown as Message);
					if (!responseText) {
						logger.debug('[CovaBot] Empty response from trigger');
						continue;
					}

					logger.debug(`[CovaBot] Web response generated: "${responseText}"`);
					return responseText;
				} catch (error) {
					logger.error(`[CovaBot] Error in trigger "${trigger.name}":`, error as Error);
					continue; // Try next trigger
				}
			}

			// No triggers matched
			return null;
		} catch (error) {
			logger.error('[CovaBot] Error processing web message:', error as Error);
			return null;
		}
	}

	/**
	 * Process incoming Discord message
	 */
	async processMessage(message: Message): Promise<void> {
		const startTime = Date.now();
		let responseGenerated = false;
		let triggerType: 'mention' | 'keyword' | 'probability' | 'stats' = 'probability';

		// Create message context for metrics
		const messageContext = this.metrics
			? {
					messageId: message.id,
					userId: message.author.id,
					username: message.author.username,
					channelId: message.channel.id,
					channelName: message.channel instanceof TextChannel ? message.channel.name : 'unknown',
					guildId: message.guild?.id || 'dm',
					messageLength: message.content.length,
					timestamp: Date.now(),
				}
			: undefined;

		try {
			// Check if bot is disabled
			if (this.config.disabled) {
				logger.debug('[CovaBot] Bot is disabled, skipping message');
				return;
			}

			if (this.shouldSkipDueToResponseRate()) {
				return;
			}

			// Skip bot messages if configured
			if (this.config.skipBotMessages && message.author.bot) {
				logger.debug('[CovaBot] Skipping bot message');
				return;
			}

			// Sort triggers by priority (highest first)
			const sortedTriggers = [...this.config.triggers].sort((a, b) => (b.priority || 0) - (a.priority || 0));

			logger.debug(`[CovaBot] Processing ${sortedTriggers.length} triggers for message: "${message.content}"`);

			// Process triggers in priority order
			for (const trigger of sortedTriggers) {
				try {
					// Determine trigger type based on name
					if (trigger.name.includes('mention')) {
						triggerType = 'mention';
					} else if (trigger.name.includes('stats')) {
						triggerType = 'stats';
					} else if (trigger.name.includes('keyword')) {
						triggerType = 'keyword';
					}

					// Check if trigger condition matches
					const matches = await trigger.condition(message);
					logger.debug(`[CovaBot] Trigger "${trigger.name}" condition result: ${matches}`);

					if (!matches) continue;

					// Log that message was accepted for processing
					logger.info(
						`[CovaBot] ✅ Message accepted | User: ${message.author.username} | Channel: ${message.channel.id} | Trigger: ${trigger.name}`,
					);
					logger.info(
						`[CovaBot] 📨 Original message: "${message.content.substring(0, 100)}${message.content.length > 100 ? '...' : ''}"`,
					);

					// Track personality trigger
					if (this.metrics && messageContext) {
						this.metrics.trackPersonalityTrigger(triggerType, messageContext);
					}

					// Get response text
					const responseText = await trigger.response(message);
					if (!responseText) {
						logger.debug('[CovaBot] Empty response from trigger');
						continue;
					}

					// Log the response that will be sent
					logger.info(
						`[CovaBot] 🤖 Generated response: "${responseText.substring(0, 150)}${responseText.length > 150 ? '...' : ''}"`,
					);

					// Use default identity
					const identity = this.config.defaultIdentity;

					// Calculate response time before sending
					const responseTime = Date.now() - startTime;

					// Send message with Cova's identity (includes logging)
					await this.sendMessage(message, responseText, identity, trigger.name, responseTime);

					// Confirm response was sent
					logger.info(`[CovaBot] ✉️ Response sent successfully as ${identity.botName}`);

					// Track successful response
					responseGenerated = true;

					if (this.metrics) {
						const responseType = responseText.length > 100 ? 'complex' : 'simple';
						this.metrics.trackPersonalityResponse(responseTime, responseText.length, responseType);
					}

					return; // Exit after first successful response
				} catch (error) {
					logger.error(`[CovaBot] Error in trigger "${trigger.name}":`, error as Error);

					// Track error response
					if (this.metrics && !responseGenerated) {
						const responseTime = Date.now() - startTime;
						this.metrics.trackPersonalityResponse(responseTime, 0, 'error');
					}

					continue; // Try next trigger
				}
			}
		} catch (error) {
			logger.error('[CovaBot] Error processing message:', error as Error);

			// Track error response if no response was generated
			if (this.metrics && !responseGenerated) {
				const responseTime = Date.now() - startTime;
				this.metrics.trackPersonalityResponse(responseTime, 0, 'error');
			}
		}
	}

	/**
	 * Send message using webhook with custom identity via DiscordService
	 */
	private async sendMessage(
		message: Message,
		content: string,
		identity: BotIdentity,
		triggerName?: string,
		responseLatency?: number,
	): Promise<void> {
		try {
			if (!(message.channel instanceof TextChannel)) {
				// If it's not a TextChannel, remain silent (no fallback)
				logger.warn('[CovaBot] Channel is not a TextChannel; message will not be sent');
				return;
			}

			// Lazy‑resolve DiscordService; keep tests simple if container not set up
			if (!this.discordService) {
				if (container.has(ServiceId.DiscordService)) {
					this.discordService = container.get<DiscordService>(ServiceId.DiscordService);
				} else {
					logger.warn('[CovaBot] DiscordService not registered; skipping send (silent)');
					return;
				}
			}

			if (this.discordService) {
				await this.discordService.sendMessageWithBotIdentity(message.channel.id, identity, content);
			}
			logger.debug(`[CovaBot] Message sent via DiscordService as ${identity.botName}`);

			// Log comprehensive bot response details
			this.logBotResponse(message, content, identity, triggerName || 'unknown', responseLatency);
		} catch (error) {
			// On any send error, remain silent (no fallback)
			logger.error('[CovaBot] Failed to send message (will remain silent):', error as Error);
		}
	}

	/**
	 * Log comprehensive bot response details to Loki/Grafana
	 */
	private logBotResponse(
		message: Message,
		responseText: string,
		identity: BotIdentity,
		triggerName: string,
		responseLatency?: number,
	): void {
		try {
			const responseLogger = getBotResponseLogger('covabot');

			// Determine trigger condition type using shared utility
			const triggerCondition = inferTriggerCondition(triggerName, 'llm_decision');

			const logEntry: BotResponseLog = {
				original_message: message.content,
				bot_response: responseText,
				timestamp: new Date().toISOString(),
				bot_name: 'CovaBot',
				nickname_used: identity.botName,
				avatar_url_used: identity.avatarUrl,
				trigger_condition: triggerCondition,
				trigger_name: triggerName,
				user_id: message.author.id,
				channel_id: message.channel.id,
				guild_id: message.guild?.id || 'dm',
				response_latency_ms: responseLatency,
				// LLM provider is not accessible in this context (omitted since it's optional)
				// The actual provider (OLLAMA) is determined at the trigger level
			};

			responseLogger.logBotResponse(logEntry);
		} catch (error) {
			// Never let logging failures break bot functionality
			logger.warn('[CovaBot] Failed to log bot response:', error as Error);
		}
	}

}
