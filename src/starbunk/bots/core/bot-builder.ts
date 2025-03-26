import { Message, TextChannel } from 'discord.js';
import { getWebhookService } from '../../../services/bootstrap';
import { logger } from '../../../services/logger';
import { BotIdentity } from '../../types/botIdentity';
import { TriggerResponse } from './trigger-response';

// Configuration for a strategy-based bot
export interface StrategyBotConfig {
	name: string;
	description: string;
	defaultIdentity: BotIdentity;
	triggers: TriggerResponse[];
	skipBotMessages?: boolean;
}

export interface StrategyBot {
	name: string;
	description: string;
	processMessage(message: Message): Promise<void>;
}

// Bot implementation using trigger-response strategy
export function createStrategyBot(config: StrategyBotConfig): StrategyBot {
	return {
		name: config.name,
		description: config.description,
		async processMessage(message: Message): Promise<void> {
			logger.debug(`[${config.name}] Processing message from ${message.author.tag}`);

			try {
				// Skip bot messages if configured
				if (config.skipBotMessages && message.author.bot) {
					logger.debug(`[${config.name}] Skipping bot message`);
					return;
				}

				// Check each trigger in order
				for (const trigger of config.triggers) {
					if (await trigger.condition(message)) {
						logger.debug(`[${config.name}] Trigger "${trigger.name}" matched`);

						// Get response text
						const responseText = await trigger.response(message);

						// Get bot identity (use trigger-specific or default)
						const identity = trigger.identity
							? (typeof trigger.identity === 'function'
								? await trigger.identity(message)
								: trigger.identity)
							: config.defaultIdentity;

						// Send response
						await getWebhookService().writeMessage(message.channel as TextChannel, {
							content: responseText,
							username: identity.botName,
							avatarURL: identity.avatarUrl
						});

						logger.debug(`[${config.name}] Response sent successfully`);
						return;
					}
				}
			} catch (error) {
				logger.error(`[${config.name}] Error processing message:`, error as Error);
				throw error;
			}
		}
	};
}
