import { Message } from 'discord.js';
import { DiscordService } from '../../../services/discordService';
import { logger } from '../../../services/logger';
import { getBotDefaults } from '../../config/botDefaults';
import { BotIdentity } from '../../types/botIdentity';
import { withDefaultBotBehavior } from './conditions';
import { TriggerResponse } from './trigger-response';

/**
 * Strongly typed bot name
 */
export type BotStrategyName = string;

export function createBotStrategyName(name: string): BotStrategyName {
	if (!name || name.trim().length === 0) {
		throw new Error('Bot strategy name cannot be empty');
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
 * Configuration for a strategy-based bot with strong typing
 */
export interface StrategyBotConfig {
	name: string;
	description: string;
	defaultIdentity: BotIdentity;
	triggers: TriggerResponse[];
	defaultResponseRate?: number; // Bot's default response rate (overrides global default)
	skipBotMessages?: boolean; // Whether to skip processing messages from other bots
}

/**
 * Validated strategy bot configuration
 */
export interface ValidatedStrategyBotConfig {
	name: BotStrategyName;
	description: BotDescription;
	defaultIdentity: BotIdentity;
	triggers: TriggerResponse[];
	defaultResponseRate: number; // Bot's default response rate
}

/**
 * Validate bot configuration and provide defaults
 */
function validateBotConfig(config: StrategyBotConfig): ValidatedStrategyBotConfig {
	// Validate required fields
	if (!config.name) {
		throw new Error('Bot name is required');
	}
	if (!config.description) {
		throw new Error('Bot description is required');
	}
	if (!config.defaultIdentity) {
		throw new Error('Default bot identity is required');
	}
	if (!config.triggers || config.triggers.length === 0) {
		throw new Error('At least one trigger is required');
	}

	// Get global defaults
	const globalDefaults = getBotDefaults();

	// Return validated config with defaults
	return {
		name: config.name,
		description: config.description,
		defaultIdentity: config.defaultIdentity,
		triggers: config.triggers,
		defaultResponseRate: config.defaultResponseRate ?? globalDefaults.responseRate
	};
}

/**
 * Public interface for a strategy bot
 */
export interface StrategyBot {
	readonly name: BotStrategyName;
	readonly description: BotDescription;
	readonly metadata?: {
		responseRate: number;
		[key: string]: unknown;
	};
	processMessage(message: Message): Promise<void>;
}

/**
 * Create a new strategy bot with validated configuration
 */
export function createStrategyBot(config: StrategyBotConfig): StrategyBot {
	// Validate the configuration
	const validConfig = validateBotConfig(config);

	// Sort triggers by priority (higher first) and add bot name
	const sortedTriggers = [...validConfig.triggers].map(trigger => ({
		...trigger,
		botName: validConfig.name,
		// Wrap the condition with default bot behavior
		condition: withDefaultBotBehavior(validConfig.name, trigger.condition)
	})).sort((a, b) => {
		const priorityA = a.priority || 0;
		const priorityB = b.priority || 0;
		// Corrected sort: Higher number (higher priority) comes first
		return Number(priorityB) - Number(priorityA);
	});

	// Create and return the bot instance
	return {
		name: validConfig.name,
		description: validConfig.description,
		metadata: {
			responseRate: validConfig.defaultResponseRate
		},

		async processMessage(message: Message): Promise<void> {
			logger.debug(`[${validConfig.name}] Processing message from ${message.author.tag}`);

			try {
				// Check response rate
				if (validConfig.defaultResponseRate < 100) {
					const randomNumber = Math.random() * 100;
					if (randomNumber >= validConfig.defaultResponseRate) {
						logger.debug(`[${validConfig.name}] Skipping message due to response rate (${randomNumber.toFixed(2)} >= ${validConfig.defaultResponseRate})`);
						return;
					}
				}

				// Check each trigger in order
				for (const trigger of sortedTriggers) {
					try {
						if (await trigger.condition(message)) {
							logger.debug(`[${validConfig.name}] Trigger "${trigger.name}" matched`);

							// Get response text
							const responseText = await trigger.response(message);

							// Skip if response is empty
							if (!responseText || responseText.trim() === '') {
								logger.debug(`[${validConfig.name}] Empty response from trigger "${trigger.name}", skipping`);
								return;
							}

							// Get bot identity (use trigger-specific or default)
							let identity: BotIdentity | null = null;
							try {
								identity = trigger.identity
									? (typeof trigger.identity === 'function'
										? await trigger.identity(message)
										: trigger.identity)
									: validConfig.defaultIdentity;

								// If identity couldn't be retrieved (null or undefined)
								if (!identity || !identity.botName || !identity.avatarUrl) {
									throw new Error('Failed to retrieve valid bot identity');
								}
							} catch (identityError) {
								logger.error(`[${validConfig.name}] Failed to get bot identity for trigger "${trigger.name}":`,
									identityError instanceof Error ? identityError : new Error(String(identityError)));
								return; // Skip sending the message
							}

							// Send response using DiscordService
							await DiscordService.getInstance().sendMessageWithBotIdentity(
								message.channel.id,
								identity,
								responseText
							);

							logger.debug(`[${validConfig.name}] Response sent successfully`);
							return;
						}
					} catch (triggerError) {
						// Log but continue with other triggers if one fails
						logger.error(`[${validConfig.name}] Error in trigger "${trigger.name}":`,
							triggerError instanceof Error ? triggerError : new Error(String(triggerError)));
					}
				}
			} catch (error) {
				logger.error(`[${validConfig.name}] Error processing message:`,
					error instanceof Error ? error : new Error(String(error)));
				// Don't re-throw to prevent crashes in the main message handling loop
			}
		}
	};
}
