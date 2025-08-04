import { logger, getConfigurationService, BotConfig, BotTriggerConfig, BotResponseConfig, container, ServiceId, DiscordService } from '@starbunk/shared';
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

			// Get DiscordService from container for webhook-based custom identities
			let discordService: DiscordService | undefined;
			try {
				discordService = container.get<DiscordService>(ServiceId.DiscordService);
				logger.debug(`✅ Retrieved DiscordService for bot: ${config.displayName}`);
			} catch (error) {
				logger.warn(`⚠️  Could not retrieve DiscordService for bot ${config.displayName}:`, error instanceof Error ? error : new Error(String(error)));
				logger.warn(`⚠️  Bot will use fallback messaging (no custom identity in webhooks)`);
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
				discordService: discordService, // 🎭 CRITICAL: Inject DiscordService for custom identity support
			}) as unknown as ReplyBot;

			logger.info(`🎉 Successfully created bot: ${config.displayName} with ${triggers.length} triggers${discordService ? ' (custom identity enabled)' : ' (fallback identity)'}`);
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
			logger.warn(`❌ No enabled response configuration found for bot: ${config.botName}`);
			return staticResponse('Bot response not configured');
		}

		switch (responseConfig.type) {
			case 'static':
				if (responseConfig.content) {
					return staticResponse(responseConfig.content);
				}
				break;

			case 'random':
				// For random responses, use alternatives array or parse content as JSON array
				if (responseConfig.alternatives && responseConfig.alternatives.length > 0) {
					return () => responseConfig.alternatives![Math.floor(Math.random() * responseConfig.alternatives!.length)];
				} else if (responseConfig.content) {
					try {
						const responses = Array.isArray(responseConfig.content)
							? responseConfig.content
							: JSON.parse(responseConfig.content);

						if (!Array.isArray(responses)) {
							logger.warn(`❌ Random response content is not an array for bot: ${config.botName}`);
							return staticResponse(responseConfig.content);
						}

						return () => responses[Math.floor(Math.random() * responses.length)];
					} catch (error) {
						logger.warn(`❌ Failed to parse random responses for bot ${config.botName}:`, error);
						return staticResponse(responseConfig.content);
					}
				}
				break;

			case 'llm':
				// For now, LLM responses are not implemented - use fallback
				logger.warn(`⚠️  LLM responses not implemented yet for bot: ${config.botName}, using fallback`);
				return staticResponse('LLM response not available');

			case 'function':
				// For now, function responses are not implemented - use fallback
				logger.warn(`⚠️  Function responses not implemented yet for bot: ${config.botName}, using fallback`);
				return staticResponse('Function response not available');

			default:
				logger.warn(`❌ Unknown response type: ${responseConfig.type} for bot: ${config.botName}`);
				return staticResponse(responseConfig.content || 'Unknown response type');
		}

		// Fallback if no response was created
		logger.warn(`❌ Failed to create response for bot: ${config.botName}`);
		return staticResponse('Bot response error');
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
