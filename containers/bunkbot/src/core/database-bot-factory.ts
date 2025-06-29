import { logger, getConfigurationService, BotConfig, BotTriggerConfig, BotResponseConfig } from '@starbunk/shared';
import { BotFactory } from './bot-factory';
import { createTriggerResponse, TriggerResponse } from './trigger-response';
import { matchesPattern } from './conditions';
import { staticResponse } from './responses';
import ReplyBot from '../replyBot';

export class DatabaseBotFactory {
	private static configService = getConfigurationService();

	/**
	 * Create a reply bot from database configuration
	 */
	public static async createBotFromConfig(botName: string): Promise<ReplyBot | null> {
		try {
			logger.info(`🤖 Loading bot configuration for: ${botName}`);

			const config = await this.configService.getBotConfiguration(botName);
			if (!config) {
				logger.warn(`❌ No configuration found for bot: ${botName}`);
				return null;
			}

			if (!config.isEnabled) {
				logger.info(`⏸️  Bot ${botName} is disabled, skipping`);
				return null;
			}

			logger.info(`✅ Loaded configuration for ${config.displayName}: ${config.description || 'No description'}`);

			// Create triggers from database patterns
			const triggers = this.createTriggersFromConfig(config);
			if (triggers.length === 0) {
				logger.warn(`⚠️  No valid triggers found for bot: ${botName}`);
				return null;
			}

			// Validate avatar URL - if not provided, bot creation fails
			if (!config.avatarUrl) {
				logger.error(`❌ Bot configuration for ${botName} missing required avatarUrl`);
				return null;
			}

			// Create the bot using the existing BotFactory
			const bot = BotFactory.createBot({
				name: config.displayName,
				description: config.description || `Database-driven bot: ${config.displayName}`,
				defaultIdentity: {
					botName: config.displayName,
					avatarUrl: config.avatarUrl,
				},
				skipBotMessages: true,
				triggers: triggers,
			}) as unknown as ReplyBot;

			logger.info(`🎉 Successfully created bot: ${config.displayName} with ${triggers.length} triggers`);
			return bot;

		} catch (error) {
			logger.error(`❌ Failed to create bot from config for ${botName}:`, error instanceof Error ? error : new Error(String(error)));
			return null;
		}
	}

	/**
	 * Create all enabled bots from database configurations
	 */
	public static async createAllBotsFromConfig(): Promise<ReplyBot[]> {
		try {
			logger.info('🤖 Loading all bot configurations from database...');

			const configs = await this.configService.getAllBotConfigurations();
			const bots: ReplyBot[] = [];

			for (const config of configs) {
				if (!config.isEnabled) {
					logger.info(`⏸️  Skipping disabled bot: ${config.botName}`);
					continue;
				}

				const bot = await this.createBotFromConfig(config.botName);
				if (bot) {
					bots.push(bot);
				}
			}

			logger.info(`✅ Successfully created ${bots.length} bots from database configurations`);
			return bots;

		} catch (error) {
			logger.error('❌ Failed to create bots from database configurations:', error instanceof Error ? error : new Error(String(error)));
			return [];
		}
	}

	/**
	 * Create triggers from bot configuration
	 */
	private static createTriggersFromConfig(config: BotConfig): TriggerResponse[] {
		const triggers: TriggerResponse[] = [];

		for (const triggerConfig of config.triggers) {
			if (!triggerConfig.isEnabled) {
				continue;
			}

			try {
				// Find corresponding response for this trigger
				const response = this.createResponseFromConfig(config, triggerConfig);
				if (!response) {
					logger.warn(`⚠️  No valid response found for trigger: ${triggerConfig.name} in bot: ${config.botName}`);
					continue;
				}

				const trigger = createTriggerResponse({
					name: `${config.botName}-${triggerConfig.name}`,
					condition: matchesPattern(triggerConfig.pattern),
					response: response,
					priority: triggerConfig.priority,
				});

				triggers.push(trigger);
				logger.debug(`✅ Created trigger: ${triggerConfig.name} for bot: ${config.botName}`);

			} catch (error) {
				logger.error(`❌ Failed to create trigger ${triggerConfig.name} for bot ${config.botName}:`, error instanceof Error ? error : new Error(String(error)));
			}
		}

		return triggers;
	}

	/**
	 * Create response function from bot configuration
	 */
	private static createResponseFromConfig(config: BotConfig, _triggerConfig: BotTriggerConfig): (message: import('discord.js').Message) => Promise<string> | string {
		// Find the best matching response for this trigger
		// For now, use the first enabled response, but this could be more sophisticated
		const responseConfig = config.responses.find((r: BotResponseConfig) => r.isEnabled);
		
		if (!responseConfig) {
			return null;
		}

		switch (responseConfig.type) {
			case 'static':
				if (responseConfig.content) {
					return staticResponse(responseConfig.content);
				}
				break;

			case 'random':
				if (responseConfig.alternatives && responseConfig.alternatives.length > 0) {
					return randomResponse(responseConfig.alternatives);
				}
				break;

			case 'llm':
				// TODO: Implement LLM response handling
				logger.warn(`⚠️  LLM responses not yet implemented for bot: ${config.botName}`);
				return null;

			case 'function':
				// TODO: Implement function-based responses
				logger.warn(`⚠️  Function responses not yet implemented for bot: ${config.botName}`);
				return null;

			default:
				logger.warn(`⚠️  Unknown response type: ${responseConfig.type} for bot: ${config.botName}`);
				return null;
		}

		return null;
	}

	/**
	 * Refresh bot configurations (clear cache)
	 */
	public static refreshConfigurations(): void {
		logger.info('🔄 Refreshing bot configurations...');
		this.configService.clearCache();
	}
}

// Helper function to create random response
function randomResponse(alternatives: string[]): () => string {
	return () => {
		const randomIndex = Math.floor(Math.random() * alternatives.length);
		return alternatives[randomIndex];
	};
}
