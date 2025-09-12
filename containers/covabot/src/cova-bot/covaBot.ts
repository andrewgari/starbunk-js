import { logger, container, ServiceId, WebhookManager, type CovaBotMetrics } from '@starbunk/shared';
import { Message, TextChannel, Webhook, Client } from 'discord.js';
import { BotIdentity } from '../types/botIdentity';
import { TriggerResponse } from '../types/triggerResponse';
import { getCovaIdentity } from '../services/identity';

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
	private readonly webhookCache = new Map<string, Webhook>();
	private webhookManager: WebhookManager | null = null;
	private metrics?: CovaBotMetrics;

	constructor(config: CovaBotConfig, metrics?: CovaBotMetrics) {
		this.config = {
			defaultResponseRate: 100,
			skipBotMessages: true,
			disabled: false,
			...config,
		};
		this.metrics = metrics;
		// Defer resolving WebhookManager until first use to avoid requiring tests to register it
		this.webhookManager = null;
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
		const messageContext = this.metrics ? {
			messageId: message.id,
			userId: message.author.id,
			username: message.author.username,
			channelId: message.channel.id,
			channelName: message.channel instanceof TextChannel ? message.channel.name : 'unknown',
			guildId: message.guild?.id || 'dm',
			messageLength: message.content.length,
			timestamp: Date.now()
		} : undefined;

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

					// Get Cova's Discord identity with server context
					const identity = await this.getCovaIdentity(message);
					if (!identity) {
						logger.debug(
							`[CovaBot] Identity resolution failed for trigger "${trigger.name}" - bot will remain silent`,
						);
						continue; // Skip this trigger, bot remains silent
					}

					// Send message with Cova's identity
					await this.sendMessage(message, responseText, identity);
					
					// Track successful response
					const responseTime = Date.now() - startTime;
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
	 * Get Cova's Discord identity with server-specific information
	 */
	private async getCovaIdentity(message: Message): Promise<BotIdentity | null> {
		try {
			return await getCovaIdentity(message);
		} catch (error) {
			logger.error('[CovaBot] Failed to get Cova identity:', error as Error);
			return null; // Bot will remain silent
		}
	}

	/**
	 * Send message using webhook with custom identity
	 */
	private async sendMessage(message: Message, content: string, identity: BotIdentity): Promise<void> {
		try {
			if (!(message.channel instanceof TextChannel)) {
				// If it's not a TextChannel, remain silent (no fallback)
				logger.warn('[CovaBot] Channel is not a TextChannel; message will not be sent');
				return;
			}

			// Lazy‑resolve WebhookManager; keep tests simple if container not set up
			if (!this.webhookManager) {
				if (container.has(ServiceId.WebhookService)) {
					this.webhookManager = container.get<WebhookManager>(ServiceId.WebhookService);
				} else {
					logger.warn('[CovaBot] WebhookService not registered; skipping send (silent)');
					return;
				}
			}

			await this.webhookManager.sendMessage(message.channel.id, {
				content,
				username: identity.botName,
				avatarURL: identity.avatarUrl,
			});
			logger.debug(`[CovaBot] Message requested via shared WebhookManager as ${identity.botName}`);
		} catch (error) {
			// On any send error, remain silent (no fallback)
			logger.error('[CovaBot] Failed to send message (will remain silent):', error as Error);
		}
	}

	/**
	 * Deprecated: direct webhook management replaced by shared WebhookManager
	 */
	private async getOrCreateWebhook(_channel: TextChannel, _client: Client): Promise<Webhook> {
		throw new Error('Direct webhook usage is deprecated in CovaBot; use WebhookManager via shared services');
	}
}
