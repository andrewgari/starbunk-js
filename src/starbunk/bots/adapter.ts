import { logger } from '../../services/logger';
import ReplyBot from './replyBot';

/**
 * This utility helps adapt different bot formats
 * It handles both class-based and module exports
 */
export function createBotAdapter(botObj: unknown): ReplyBot | null {
	if (!botObj || typeof botObj !== 'object') {
		return null;
	}

	try {
		// Check if it's already a ReplyBot
		const bot = botObj as Partial<ReplyBot>;
		if (bot && typeof bot.defaultBotName === 'string' && typeof bot.auditMessage === 'function') {
			return botObj as ReplyBot;
		}
	} catch (error) {
		logger.error('Error creating bot adapter:', error instanceof Error ? error : new Error(String(error)));
	}

	return null;
}

/**
 * Try to import a bot module and adapt it to the ReplyBot interface
 */
export async function importAndAdaptBot(modulePath: string): Promise<ReplyBot | null> {
	try {
		const botModule = await import(modulePath);

		// Handle CommonJS default export
		if (botModule && botModule.__esModule && botModule.default) {
			if (typeof botModule.default === 'function') {
				try {
					// Try to instantiate the class
					const BotClass = botModule.default;
					const bot = new BotClass();
					return createBotAdapter(bot);
				} catch (error) {
					logger.error(`Error instantiating bot class from ${modulePath}:`, error instanceof Error ? error : new Error(String(error)));
				}
			}
			else if (typeof botModule.default === 'object') {
				return createBotAdapter(botModule.default);
			}
		}
		// Handle direct export
		else if (botModule) {
			if (typeof botModule === 'function') {
				try {
					const bot = new botModule();
					return createBotAdapter(bot);
				} catch (error) {
					logger.error(`Error instantiating bot from ${modulePath}:`, error instanceof Error ? error : new Error(String(error)));
				}
			}
			else if (typeof botModule === 'object') {
				return createBotAdapter(botModule);
			}
		}

		return null;
	} catch (error) {
		logger.error(`Error importing bot module from ${modulePath}:`, error instanceof Error ? error : new Error(String(error)));
		return null;
	}
}
