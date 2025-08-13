import { logger, isDebugMode, DiscordService } from '@starbunk/shared';
import { Message } from 'discord.js';
import { getBotDefaults } from '../config/botDefaults';
import { BotIdentity } from '../types/botIdentity';
import { TriggerResponse } from './trigger-response';
import { shouldExcludeFromReplyBots } from './conditions';

/**
 * Type for message filtering function
 */
export type MessageFilterFunction = (message: Message) => boolean | Promise<boolean>;

/**
 * Default message filter that bots use unless they provide their own
 * Only skips BunkBot self-messages, allows all other messages through
 */
export function defaultMessageFilter(message: Message): boolean {
	// Handle null/undefined message gracefully
	if (!message?.author) {
		return false; // Default to not skip for malformed messages
	}

	// Only skip if message is from BunkBot itself (self-message)
	if (shouldExcludeFromReplyBots(message)) {
		if (isDebugMode()) {
			logger.debug(`🚫 Skipping BunkBot self-message`);
		}
		return true; // Skip this message
	}

	// Allow all other messages (human, CovaBot, other bots, etc.)
	if (isDebugMode()) {
		logger.debug(`✅ Processing message from: ${message.author.username}`);
	}
	return false; // Don't skip
}

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
 * Configuration for a reply-based bot with strong typing
 */
export interface ReplyBotConfig {
	name: string;
	description: string;
	defaultIdentity: BotIdentity;
	triggers: TriggerResponse[];
	defaultResponseRate?: number; // Bot's default response rate (overrides global default)
	responseRate?: number; // Specific response rate for this bot (overrides defaultResponseRate)
	messageFilter?: MessageFilterFunction; // Custom message filtering function
	skipBotMessages?: boolean; // Whether to skip processing messages from other bots (deprecated - use messageFilter)
	disabled?: boolean; // Whether the bot is disabled
	discordService?: DiscordService; // Discord service for sending messages (optional)
}

/**
 * Validated reply bot configuration
 */
export interface ValidatedReplyBotConfig {
	name: BotReplyName;
	description: BotDescription;
	defaultIdentity: BotIdentity;
	triggers: TriggerResponse[];
	defaultResponseRate: number; // Bot's default response rate
	messageFilter: MessageFilterFunction; // Message filtering function
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
	if (!config.defaultIdentity) {
		throw new Error('Default bot identity is required');
	}
	if (!config.triggers || config.triggers.length === 0) {
		throw new Error('At least one trigger is required');
	}


	const responseRate = config.responseRate ?? config.defaultResponseRate ?? getBotDefaults().responseRate;
	const disabled = config.disabled ?? false;

	// Use custom messageFilter if provided, otherwise use default behavior
	let messageFilter: MessageFilterFunction;
	if (config.messageFilter) {
		messageFilter = config.messageFilter;
	} else if (config.skipBotMessages === false) {
		// If explicitly set to false, never skip messages
		messageFilter = async () => false;
	} else {
		// Default behavior - use default message filter
		messageFilter = defaultMessageFilter;
	}

	return {
		name: createBotReplyName(config.name),
		description: createBotDescription(config.description),
		defaultIdentity: config.defaultIdentity,
		triggers: config.triggers,
		defaultResponseRate: responseRate,
		messageFilter,
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
	shouldRespond(message: Message): Promise<boolean>;
	processMessage(message: Message): Promise<void>;
}

/**
 * Create a new reply bot with validated configuration
 */
export function createReplyBot(config: ReplyBotConfig): ReplyBotImpl {
	const validConfig = validateBotConfig(config);
	// Note: Database functionality disabled for now - using in-memory storage

	return {
		name: validConfig.name,
		description: validConfig.description,
		metadata: {
			responseRate: validConfig.defaultResponseRate,
			disabled: validConfig.disabled,
		},
		async shouldRespond(message: Message): Promise<boolean> {
			// Check if bot is disabled first
			if (validConfig.disabled) {
				return false;
			}

			// Check response rate
			if (validConfig.defaultResponseRate <= 0) {
				return false;
			}

			// Apply random response rate
			if (Math.random() * 100 > validConfig.defaultResponseRate) {
				return false;
			}


			// Check message filter
			const shouldSkip = await validConfig.messageFilter(message);
			if (shouldSkip) {
				return false;
			}

			// Check triggers - sort by priority and test each one
			const sortedTriggers = [...validConfig.triggers].sort((a, b) => (b.priority || 0) - (a.priority || 0));

			for (const trigger of sortedTriggers) {
				try {
					const matches = await trigger.condition(message);
					if (matches) {
						return true; // At least one trigger matches
					}
				} catch (error) {
					logger.debug(`[${validConfig.name}] Error checking trigger "${trigger.name}":`, error as Error);
				}
			}

			return false; // No triggers matched
		},
		async processMessage(message: Message): Promise<void> {
			// Use shouldRespond to determine if we should process this message
			// This avoids duplicating all the filtering logic
			const shouldProcess = await this.shouldRespond(message);
			if (!shouldProcess) {
				return;
			}
			// Check message filter
			const shouldSkip = await validConfig.messageFilter(message);
			if (shouldSkip) {
				return false;
			}

			// Check triggers - sort by priority and test each one
			const sortedTriggers = [...validConfig.triggers].sort((a, b) => (b.priority || 0) - (a.priority || 0));
			
			for (const trigger of sortedTriggers) {
				try {
					const matches = await trigger.condition(message);
					if (matches) {
						return true; // At least one trigger matches
					}
				} catch (error) {
					logger.debug(`[${validConfig.name}] Error checking trigger "${trigger.name}":`, error as Error);
				}
			}

			return false; // No triggers matched
		},
		async processMessage(message: Message): Promise<void> {
			// Use shouldRespond to determine if we should process this message
			// This avoids duplicating all the filtering logic
			const shouldProcess = await this.shouldRespond(message);
			if (!shouldProcess) {
				return;

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

					// Get identity
					let identity: BotIdentity | null;
					try {
						identity =
							typeof trigger.identity === 'function'
								? await trigger.identity(message)
								: trigger.identity || validConfig.defaultIdentity;

						if (!identity) {
							logger.debug(`[${validConfig.name}] Identity resolution failed for trigger "${trigger.name}" - bot will remain silent`);
							continue; // Skip this trigger, bot remains silent
						}

						// Debug log the resolved identity
						logger.debug(`[${validConfig.name}] ✅ Identity resolved: name="${identity.botName}", avatar="${identity.avatarUrl}"`);
					} catch (error) {
						logger.error('Failed to get bot identity', error as Error);
						continue;
					}

					// Send message with custom bot identity using DiscordService
					try {
						// Try to get DiscordService from container first
						let discordService = validConfig.discordService;
						if (!discordService) {
							try {
								const { container, ServiceId } = await import('@starbunk/shared');
								discordService = container.get(ServiceId.DiscordService);
							} catch (containerError) {
								logger.debug('Could not get DiscordService from container:', containerError as Error);
							}
						}

						if (discordService) {
							// Use DiscordService with custom bot identity (webhooks)
							await discordService.sendMessageWithBotIdentity(
								message.channel.id,
								identity,
								responseText
							);
							logger.debug(`Message sent via DiscordService webhook as ${identity.botName}`);
						} else {
							// Fallback to regular message sending (no custom identity)
							logger.warn(`No DiscordService available - falling back to regular message (no custom identity)`);
							if ('send' in message.channel) {
								await message.channel.send(responseText);
								logger.debug(`Message sent via regular channel (no custom identity)`);
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



