import { logger } from '@starbunk/shared';
import { Client, Message, TextChannel, Webhook } from 'discord.js';
import { getBotDefaults } from '../config/botDefaults';
import { BotIdentity } from '../types/botIdentity';
import { TriggerResponse } from './trigger-response';

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
	skipBotMessages?: boolean; // Whether to skip processing messages from other bots
	disabled?: boolean; // Whether the bot is disabled
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
	skipBotMessages: boolean; // Whether to skip processing messages from other bots
	disabled: boolean; // Whether the bot is disabled
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

	return {
		name: createBotReplyName(config.name),
		description: createBotDescription(config.description),
		defaultIdentity: config.defaultIdentity,
		triggers: config.triggers,
		defaultResponseRate: responseRate,
		skipBotMessages: config.skipBotMessages ?? true, // Default to true for safer behavior
		disabled,
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

	return {
		name: validConfig.name,
		description: validConfig.description,
		metadata: {
			responseRate: validConfig.defaultResponseRate,
			disabled: validConfig.disabled,
		},
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

			// Skip bot messages if configured
			if (validConfig.skipBotMessages && message.author.bot) {
				logger.debug('Skipping bot message');
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
					} catch (error) {
						logger.error('Failed to get bot identity', error as Error);
						continue;
					}

					// Send message with custom bot identity using webhooks
					try {
						if (message.channel instanceof TextChannel) {
							// Use webhook for custom bot identity
							const webhook = await getOrCreateWebhook(message.channel, message.client);
							await webhook.send({
								content: responseText,
								username: identity.botName,
								avatarURL: identity.avatarUrl
							});
							logger.debug(`Message sent via webhook as ${identity.botName}`);
						} else if ('send' in message.channel) {
							// Fallback to regular message for non-text channels
							await message.channel.send(responseText);
							logger.debug(`Message sent via regular channel (no webhook support)`);
						} else {
							logger.warn(`Channel does not support sending messages`);
						}
					} catch (error) {
						logger.error(`Failed to send message to channel:`, error as Error);
						// Fallback to regular message if webhook fails
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

// Webhook cache for custom bot identities
const webhookCache = new Map<string, Webhook>();

async function getOrCreateWebhook(channel: TextChannel, client: Client): Promise<Webhook> {
	const cacheKey = channel.id;
	const cachedWebhook = webhookCache.get(cacheKey);
	if (cachedWebhook) {
		return cachedWebhook;
	}

	try {
		// Try to find existing webhook
		const webhooks = await channel.fetchWebhooks();
		const existingWebhook = webhooks.find(w => w.owner?.id === client.user?.id);
		if (existingWebhook) {
			webhookCache.set(cacheKey, existingWebhook);
			return existingWebhook;
		}

		// Create new webhook if none exists
		if (!client.user) {
			throw new Error('Client user not available');
		}

		const newWebhook = await channel.createWebhook({
			name: 'BunkBot Webhook',
			avatar: client.user.displayAvatarURL()
		});
		webhookCache.set(cacheKey, newWebhook);
		return newWebhook;
	} catch (error) {
		logger.error(`Error in getOrCreateWebhook: ${error instanceof Error ? error.message : String(error)}`);
		throw new Error(`Could not get or create webhook: ${error instanceof Error ? error.message : String(error)}`);
	}
}

