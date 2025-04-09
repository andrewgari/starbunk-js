import { Message } from 'discord.js';
import { getDiscordService } from "@/services/bootstrap";
import { logger } from '../../../services/logger';
import { getBotDefaults } from '../../config/botDefaults';
import { BotIdentity } from '../../types/botIdentity';
import { TriggerResponse } from './trigger-response';

/**
 * Strongly typed bot name
 */
export type BotStrategyName = string;

export function createBotStrategyName(name: string): BotStrategyName {
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
 * Configuration for a strategy-based bot with strong typing
 */
export interface StrategyBotConfig {
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
 * Validated strategy bot configuration
 */
export interface ValidatedStrategyBotConfig {
	name: BotStrategyName;
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
export function validateBotConfig(config: StrategyBotConfig): ValidatedStrategyBotConfig {
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
		name: createBotStrategyName(config.name),
		description: createBotDescription(config.description),
		defaultIdentity: config.defaultIdentity,
		triggers: config.triggers,
		defaultResponseRate: responseRate,
		skipBotMessages: config.skipBotMessages ?? false,
		disabled
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
		disabled: boolean;
		[key: string]: unknown;
	};
	processMessage(message: Message): Promise<void>;
}

/**
 * Create a new strategy bot with validated configuration
 */
export function createStrategyBot(config: StrategyBotConfig): StrategyBot {
	const validConfig = validateBotConfig(config);

	return {
		name: validConfig.name,
		description: validConfig.description,
		metadata: {
			responseRate: validConfig.defaultResponseRate,
			disabled: validConfig.disabled
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
			if (config.skipBotMessages && message.author.bot) {
				logger.debug('Skipping bot message');
				return;
			}

			// Sort and process triggers in priority order
			const sortedTriggers = [...validConfig.triggers].sort((a, b) =>
				(b.priority || 0) - (a.priority || 0)
			);

			// Process triggers in order
			for (const trigger of sortedTriggers) {
				try {
					// Check if trigger matches
					const matches = await trigger.condition(message);
					if (!matches) continue;

					// Get response
					const responseText = await trigger.response(message);
					if (!responseText) {
						logger.debug('Empty response from trigger');
						continue;
					}

					// Get identity
					let identity: BotIdentity;
					try {
						identity = typeof trigger.identity === 'function'
							? await trigger.identity(message)
							: trigger.identity || validConfig.defaultIdentity;

						if (!identity) {
							throw new Error('Failed to retrieve valid bot identity');
						}
					} catch (error) {
						logger.error('Failed to get bot identity', error as Error);
						continue;
					}

					// Send message
					await getDiscordService().sendMessageWithBotIdentity(
						message.channel.id,
						identity,
						responseText
					);
					return;
				} catch (error) {
					logger.error('Error in trigger', error as Error);
					continue;
				}
			}
		}
	};
}
