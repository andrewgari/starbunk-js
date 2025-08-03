import { logger, isDebugMode, DiscordService, container, ServiceId } from '@starbunk/shared';
import { Message } from 'discord.js';
import { getBotDefaults } from '../config/botDefaults';
import { BotIdentity } from '../types/botIdentity';
import { TriggerResponse } from './trigger-response';
import { BotIdentityConfig } from './bot-factory';
import { BotIdentityService } from '../services/botIdentityService';

/**
 * Strongly typed bot name
 */
export type BotReplyName = string;

export function createBotReplyName(name: string): BotReplyName {
	if (!name || name.trim().length === 0) {
		throw new Error('Bot name is required');
	}
	return name;
}

/**
 * Strongly typed bot description
 */
export type BotDescription = string;

export function createBotDescription(description: string): BotDescription {
	if (!description || description.trim().length === 0) {
		throw new Error('Bot description cannot be empty');
	}
	return description;
}

/**
 * Get BotIdentityService instance from the container
 * @returns BotIdentityService instance or null if not available
 */
function getBotIdentityService(): BotIdentityService | null {
	try {
		// Try to get from container first (if available)
		if (container && container.get) {
			return container.get<BotIdentityService>(ServiceId.BotIdentityService);
		}
	} catch (error) {
		// Container might not be available or service not registered
		logger.debug('[BotBuilder] BotIdentityService not available from container');
	}
	return null;
}

/**
 * Configuration for a reply-based bot with strong typing
 */
export interface ReplyBotConfig {
	name: string;
	description: string;
	defaultIdentity?: BotIdentity; // Legacy support for existing bots
	identityConfig?: BotIdentityConfig; // New identity configuration system
	triggers: TriggerResponse[];
	defaultResponseRate?: number; // Bot's default response rate (overrides global default)
	responseRate?: number; // Specific response rate for this bot (overrides defaultResponseRate)
	skipBotMessages?: boolean; // Whether to skip processing messages from other bots
	disabled?: boolean; // Whether the bot is disabled
	discordService?: DiscordService; // Discord service for sending messages (optional)
}

/**
 * Validated reply bot configuration
 */
export interface ValidatedReplyBotConfig {
	name: BotReplyName;
	description: BotDescription;
	defaultIdentity?: BotIdentity; // Legacy support
	identityConfig?: BotIdentityConfig; // New identity configuration system
	triggers: TriggerResponse[];
	defaultResponseRate: number; // Bot's default response rate
	skipBotMessages: boolean; // Whether to skip processing messages from other bots
	disabled: boolean; // Whether the bot is disabled
	discordService?: DiscordService; // Discord service for sending messages (optional)
}

/**
 * Validate bot configuration and provide defaults
 */
export function validateBotConfig(config: ReplyBotConfig): ValidatedReplyBotConfig {
	// Validate required fields
	if (!config.name || config.name.trim() === '') {
		throw new Error('Bot name is required');
	}
	if (!config.description || config.description.trim() === '') {
		throw new Error('Bot description cannot be empty');
	}
	// Identity validation - either legacy defaultIdentity or new identityConfig required
	if (!config.defaultIdentity && !config.identityConfig) {
		throw new Error('Bot identity configuration is required (defaultIdentity or identityConfig)');
	}
	if (!config.triggers || config.triggers.length === 0) {
		throw new Error('At least one trigger is required');
	}


	const responseRate = config.responseRate ?? config.defaultResponseRate ?? getBotDefaults().responseRate;
	const disabled = config.disabled ?? false;

	return {
		name: createBotReplyName(config.name),
		description: createBotDescription(config.description),
		defaultIdentity: config.defaultIdentity,
		identityConfig: config.identityConfig,
		triggers: config.triggers,
		defaultResponseRate: responseRate,
		skipBotMessages: config.skipBotMessages ?? true, // Default to true for safer behavior
		disabled,
		discordService: config.discordService, // DiscordService (optional)
	};
}

/**
 * Public interface for a reply bot implementation
 */
export interface ReplyBotImpl {
	readonly name: BotReplyName;
	readonly description: BotDescription;
	readonly metadata?: {
		responseRate: number;
		disabled: boolean;
		[key: string]: unknown;
	};
	processMessage(message: Message): Promise<void>;
}

/**
 * Create a new reply bot with validated configuration
 */
export function createReplyBot(config: ReplyBotConfig): ReplyBotImpl {
	const validConfig = validateBotConfig(config);
	// Note: Database functionality disabled for now - using in-memory storage

	const botImpl = {
		name: validConfig.name,
		description: validConfig.description,
		metadata: {
			responseRate: validConfig.defaultResponseRate,
			disabled: validConfig.disabled,
		},
		// Store config for potential DiscordService injection
		_config: config,
		async processMessage(message: Message): Promise<void> {
			// Check if bot is disabled first
			if (validConfig.disabled) {
				logger.debug('Bot is disabled, skipping message');
				return;
			}

			// Check response rate next, before any other processing
			if (validConfig.defaultResponseRate <= 0) {
				logger.debug('Skipping message due to response rate');
				return;
			}

			if (validConfig.defaultResponseRate < 100) {
				const randomValue = Math.random() * 100;
				if (randomValue >= validConfig.defaultResponseRate) {
					logger.debug('Skipping message due to response rate');
					return;
				}
			}

			// Enhanced bot message filtering
			if (validConfig.skipBotMessages && message.author.bot) {
				// Check if this is an E2E test message first
				const isE2ETestMessage = (
					process.env.E2E_TEST_ENABLED === 'true' && (
						message.author?.username === 'E2E Test User' ||  // Webhook messages
						message.webhookId !== null ||                     // Any webhook message
						message.author?.id === process.env.E2E_TEST_USER_ID // E2E bot messages
					)
				);

				if (isE2ETestMessage) {
					if (isDebugMode()) {
						logger.debug(`[${validConfig.name}] ✅ Processing E2E test message from: ${message.author.username} (webhook: ${message.webhookId !== null})`);
					}
					// Continue processing E2E test messages
				} else {
					// Import the enhanced filtering function
					const { shouldExcludeFromReplyBots } = await import('./conditions');

					if (shouldExcludeFromReplyBots(message)) {
						if (isDebugMode()) {
							logger.debug(`[${validConfig.name}] 🚫 Skipping excluded bot message from: ${message.author.username}`);
						}
						return;
					}

					// For non-excluded bot messages, log but continue processing
					if (isDebugMode()) {
						logger.debug(`[${validConfig.name}] ⚠️ Processing bot message from: ${message.author.username} (not excluded)`);
					}
				}
			}

			// Check blacklist (simple in-memory implementation)
			const guildId = message.guild?.id;
			const userId = message.author.id;
			if (guildId) {
				const blacklistKey = `blacklist:${guildId}:${userId}`;
				const blacklisted = getBotData(validConfig.name, blacklistKey);
				if (blacklisted) {
					logger.debug(`Skipping message from blacklisted user ${userId} in guild ${guildId}`);
					return;
				}
			}

			// Sort and process triggers in priority order
			const sortedTriggers = [...validConfig.triggers].sort((a, b) => (b.priority || 0) - (a.priority || 0));

			// Process triggers in order
			logger.debug(`[${validConfig.name}] Processing ${sortedTriggers.length} triggers for message: "${message.content}"`);
			for (const trigger of sortedTriggers) {
				try {
					// Check if trigger matches
					const matches = await trigger.condition(message);
					logger.debug(`[${validConfig.name}] Trigger "${trigger.name}" condition result: ${matches}`);
					if (!matches) continue;

					// Get response
					const responseText = await trigger.response(message);
					if (!responseText) {
						logger.debug('Empty response from trigger');
						continue;
					}

					// Get identity using new identity resolution system
					let identity: BotIdentity | null;
					try {
						// First try trigger-specific identity (legacy support)
						if (trigger.identity) {
							identity = typeof trigger.identity === 'function'
								? await trigger.identity(message)
								: trigger.identity;
						} else {
							// Use new identity resolution system
							const botIdentityService = getBotIdentityService();
							if (botIdentityService && validConfig.identityConfig) {
								identity = await botIdentityService.resolveBotIdentity(
									validConfig.name,
									validConfig.identityConfig,
									message,
									validConfig.defaultIdentity
								);
							} else {
								// Fallback to legacy defaultIdentity
								identity = validConfig.defaultIdentity || null;
							}
						}

						if (!identity) {
							logger.debug(`[${validConfig.name}] Identity resolution failed for trigger "${trigger.name}" - bot will remain silent`);
							continue; // Skip this trigger, bot remains silent
						}
					} catch (error) {
						logger.error('Failed to get bot identity', error as Error);
						continue;
					}

					// Send message using DiscordService if available, otherwise use webhooks
					try {
						if (validConfig.discordService) {
							// Use DiscordService for webhook-based custom identity
							logger.debug(`[${validConfig.name}] 🎭 Sending message with custom identity: ${identity.botName} (${identity.avatarUrl})`);
							await validConfig.discordService.sendMessageWithBotIdentity(
								message.channel.id,
								identity,
								responseText
							);
							logger.debug(`[${validConfig.name}] ✅ Message sent via DiscordService as ${identity.botName}`);
						} else {
							// Fallback to regular message sending (no custom identity)
							logger.warn(`[${validConfig.name}] ⚠️ No DiscordService available - falling back to regular message sending (will appear as default bot identity)`);
							logger.warn(`[${validConfig.name}] Expected identity: ${identity.botName} (${identity.avatarUrl})`);
							if ('send' in message.channel) {
								await message.channel.send(responseText);
								logger.debug(`[${validConfig.name}] Message sent via regular channel (no custom identity)`);
							} else {
								logger.warn(`Channel does not support sending messages`);
							}
						}
					} catch (error) {
						logger.error(`Failed to send message:`, error as Error);
						// Fallback to regular message if everything else fails
						try {
							if ('send' in message.channel) {
								await message.channel.send(responseText);
								logger.debug(`Fallback message sent via regular channel`);
							}
						} catch (fallbackError) {
							logger.error(`Fallback message also failed:`, fallbackError as Error);
						}
					}
					return;
				} catch (error) {
					logger.error('Error in trigger', error as Error);
				}
			}
		},
	};

	return botImpl;
}
// Simple in-memory storage for bot data (replaces Prisma for now)
const botStorage = new Map<string, string | number | boolean>();

function getBotData(botName: string, key: string): string | number | boolean | undefined {
	const botKey = `${botName}:${key}`;
	return botStorage.get(botKey);
}

function setBotData(botName: string, key: string, value: string | number | boolean): void {
	const botKey = `${botName}:${key}`;
	botStorage.set(botKey, value);
}

// Export for testing
export { setBotData };



