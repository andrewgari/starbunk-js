import { logger } from '@starbunk/shared';
import { Message, TextChannel, Webhook, Client } from 'discord.js';
import { BotIdentity } from '../types/botIdentity';
import { TriggerResponse } from '../types/triggerResponse';
import { CovaIdentityService } from '../services/identity';

/**
 * Mock Message class for web testing (non-Discord usage)
 */
export class MockMessage {
	public content: string;
	public author: { id: string; bot: boolean };
	public mentions: { has: (userId: string) => boolean };
	public guild: { id: string } | null;
	public channel: { send: (content: string) => Promise<void> };
	public client: { user: { id: string } | null };

	constructor(content: string, authorId: string = 'web-user') {
		this.content = content;
		this.author = { id: authorId, bot: false };
		this.mentions = { has: () => false }; // No mentions in web testing
		this.guild = null; // No guild context for web testing
		this.channel = { send: async () => {} }; // No-op for web testing
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

	constructor(config: CovaBotConfig) {
		this.config = {
			defaultResponseRate: 100,
			skipBotMessages: true,
			disabled: false,
			...config,
		};
		// CovaIdentityService is a static class, no need to instantiate
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

			// Check response rate
			if ((this.config.defaultResponseRate || 100) <= 0) {
				logger.debug('[CovaBot] Skipping message due to response rate');
				return null;
			}

			if ((this.config.defaultResponseRate || 100) < 100) {
				const randomValue = Math.random() * 100;
				if (randomValue >= (this.config.defaultResponseRate || 100)) {
					logger.debug('[CovaBot] Skipping message due to response rate');
					return null;
				}
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
		try {
			// Check if bot is disabled
			if (this.config.disabled) {
				logger.debug('[CovaBot] Bot is disabled, skipping message');
				return;
			}

			// Check response rate
			if ((this.config.defaultResponseRate || 100) <= 0) {
				logger.debug('[CovaBot] Skipping message due to response rate');
				return;
			}

			if ((this.config.defaultResponseRate || 100) < 100) {
				const randomValue = Math.random() * 100;
				if (randomValue >= (this.config.defaultResponseRate || 100)) {
					logger.debug('[CovaBot] Skipping message due to response rate');
					return;
				}
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
					// Check if trigger condition matches
					const matches = await trigger.condition(message);
					logger.debug(`[CovaBot] Trigger "${trigger.name}" condition result: ${matches}`);
					
					if (!matches) continue;

					// Get response text
					const responseText = await trigger.response(message);
					if (!responseText) {
						logger.debug('[CovaBot] Empty response from trigger');
						continue;
					}

					// Get Cova's Discord identity with server context
					const identity = await this.getCovaIdentity(message);
					if (!identity) {
						logger.debug(`[CovaBot] Identity resolution failed for trigger "${trigger.name}" - bot will remain silent`);
						continue; // Skip this trigger, bot remains silent
					}

					// Send message with Cova's identity
					await this.sendMessage(message, responseText, identity);
					return; // Exit after first successful response

				} catch (error) {
					logger.error(`[CovaBot] Error in trigger "${trigger.name}":`, error as Error);
					continue; // Try next trigger
				}
			}

		} catch (error) {
			logger.error('[CovaBot] Error processing message:', error as Error);
		}
	}

	/**
	 * Get Cova's Discord identity with server-specific information
	 */
	private async getCovaIdentity(message: Message): Promise<BotIdentity | null> {
		try {
			return await CovaIdentityService.getCovaIdentity(message);
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
			if (message.channel instanceof TextChannel) {
				// Use webhook for custom bot identity
				const webhook = await this.getOrCreateWebhook(message.channel, message.client);
				await webhook.send({
					content,
					username: identity.botName,
					avatarURL: identity.avatarUrl
				});
				logger.debug(`[CovaBot] Message sent via webhook as ${identity.botName}`);
			} else if ('send' in message.channel) {
				// Fallback to regular message for non-text channels
				await message.channel.send(content);
				logger.debug('[CovaBot] Message sent via regular channel (no webhook support)');
			} else {
				logger.warn('[CovaBot] Channel does not support sending messages');
			}
		} catch (error) {
			logger.error('[CovaBot] Failed to send message:', error as Error);
			
			// Fallback to regular message if webhook fails
			try {
				if ('send' in message.channel) {
					await message.channel.send(content);
					logger.debug('[CovaBot] Fallback message sent via regular channel');
				}
			} catch (fallbackError) {
				logger.error('[CovaBot] Fallback message also failed:', fallbackError as Error);
			}
		}
	}

	/**
	 * Get or create webhook for custom identity
	 */
	private async getOrCreateWebhook(channel: TextChannel, client: Client): Promise<Webhook> {
		const cacheKey = channel.id;
		const cachedWebhook = this.webhookCache.get(cacheKey);
		
		if (cachedWebhook) {
			return cachedWebhook;
		}

		try {
			// Try to find existing webhook
			const webhooks = await channel.fetchWebhooks();
			const existingWebhook = webhooks.find(w => w.owner?.id === client.user?.id);
			
			if (existingWebhook) {
				this.webhookCache.set(cacheKey, existingWebhook);
				return existingWebhook;
			}

			// Create new webhook if none exists
			if (!client.user) {
				throw new Error('Client user not available');
			}

			const newWebhook = await channel.createWebhook({
				name: 'CovaBot Webhook',
				avatar: client.user.displayAvatarURL()
			});
			
			this.webhookCache.set(cacheKey, newWebhook);
			return newWebhook;
			
		} catch (error) {
			logger.error(`[CovaBot] Error in getOrCreateWebhook: ${error instanceof Error ? error.message : String(error)}`);
			throw new Error(`Could not get or create webhook: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
}
