import { Message, TextChannel } from 'discord.js';
import { getWebhookService } from '../../../services/bootstrap';
import { logger } from '../../../services/logger';
import { BotIdentity } from '../../types/botIdentity';
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
	skipBotMessages?: boolean;
}

/**
 * Validated strategy bot configuration
 */
export interface ValidatedStrategyBotConfig {
	name: BotStrategyName;
	description: BotDescription;
	defaultIdentity: BotIdentity;
	triggers: TriggerResponse[];
	skipBotMessages: boolean;
}

/**
 * Validate the bot configuration
 */
function validateBotConfig(config: StrategyBotConfig): ValidatedStrategyBotConfig {
	// Validate name and description
	const name = createBotStrategyName(config.name);
	const description = createBotDescription(config.description);
  
	// Validate that we have at least one trigger
	if (!config.triggers || config.triggers.length === 0) {
		throw new Error(`Bot ${config.name} must have at least one trigger`);
	}
  
	// Ensure all triggers have unique names
	const triggerNames = new Set<string>();
	for (const trigger of config.triggers) {
		const nameStr = trigger.name.toString();
		if (triggerNames.has(nameStr)) {
			throw new Error(`Bot ${config.name} has duplicate trigger name: ${nameStr}`);
		}
		triggerNames.add(nameStr);
	}

	return {
		name,
		description,
		defaultIdentity: config.defaultIdentity,
		triggers: config.triggers,
		skipBotMessages: config.skipBotMessages ?? true
	};
}

/**
 * Public interface for a strategy bot
 */
export interface StrategyBot {
	readonly name: BotStrategyName;
	readonly description: BotDescription;
	processMessage(message: Message): Promise<void>;
}

/**
 * Create a new strategy bot with validated configuration
 */
export function createStrategyBot(config: StrategyBotConfig): StrategyBot {
	// Validate the configuration
	const validConfig = validateBotConfig(config);
  
	// Sort triggers by priority (higher first)
	const sortedTriggers = [...validConfig.triggers].sort((a, b) => {
		const priorityA = a.priority || 0;
		const priorityB = b.priority || 0;
		return Number(priorityB) - Number(priorityA);
	});

	// Create and return the bot instance
	return {
		name: validConfig.name,
		description: validConfig.description,
    
		async processMessage(message: Message): Promise<void> {
			logger.debug(`[${validConfig.name}] Processing message from ${message.author.tag}`);

			try {
				// Skip bot messages if configured
				if (validConfig.skipBotMessages && message.author.bot) {
					logger.debug(`[${validConfig.name}] Skipping bot message`);
					return;
				}

				// Check each trigger in order
				for (const trigger of sortedTriggers) {
					try {
						if (await trigger.condition(message)) {
							logger.debug(`[${validConfig.name}] Trigger "${trigger.name}" matched`);

							// Get response text
							const responseText = await trigger.response(message);

							// Get bot identity (use trigger-specific or default)
							const identity = trigger.identity
								? (typeof trigger.identity === 'function'
									? await trigger.identity(message)
									: trigger.identity)
								: validConfig.defaultIdentity;

							// Send response
							await getWebhookService().writeMessage(message.channel as TextChannel, {
								content: responseText,
								username: identity.botName,
								avatarURL: identity.avatarUrl
							});

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