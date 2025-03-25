import { logger } from '../../services/logger';
import ReplyBot from './replyBot';

export class BotRegistry {
	private static instance = new BotRegistry();
	private botStates = new Map<string, boolean>();
	private bots = new Map<string, ReplyBot>();

	public static getInstance(): BotRegistry {
		return BotRegistry.instance;
	}

	public registerBot(bot: ReplyBot): void {
		const botName = bot.defaultBotName;
		this.bots.set(botName, bot);
		// Initialize as enabled
		this.botStates.set(botName, true);
		const rate = bot.getResponseRate();
		logger.debug(`[BotRegistry] Registered bot: ${botName} with response rate ${rate}%`);
	}

	public enableBot(botName: string): boolean {
		if (!this.bots.has(botName)) {
			logger.warn(`[BotRegistry] Attempted to enable non-existent bot: ${botName}`);
			return false;
		}
		this.botStates.set(botName, true);
		logger.info(`[BotRegistry] Enabled bot: ${botName}`);
		return true;
	}

	public disableBot(botName: string): boolean {
		if (!this.bots.has(botName)) {
			logger.warn(`[BotRegistry] Attempted to disable non-existent bot: ${botName}`);
			return false;
		}
		this.botStates.set(botName, false);
		logger.info(`[BotRegistry] Disabled bot: ${botName}`);
		return true;
	}

	public isBotEnabled(botName: string): boolean {
		return this.botStates.get(botName) ?? true;
	}

	public getAllBotNames(): string[] {
		const names = Array.from(this.bots.keys());
		logger.debug(`[BotRegistry] Retrieved ${names.length} bot names: ${names.join(', ')}`);
		return names;
	}

	public setBotFrequency(botName: string, rate: number): boolean {
		const bot = this.bots.get(botName);
		if (!bot) {
			logger.warn(`[BotRegistry] Attempted to set frequency for non-existent bot: ${botName}`);
			return false;
		}
		try {
			bot.setResponseRate(rate);
			logger.info(`[BotRegistry] Set response rate for ${botName} to ${rate}%`);
			return true;
		} catch (error) {
			logger.error(`[BotRegistry] Error setting response rate for ${botName}:`, error as Error);
			return false;
		}
	}

	public getBotFrequency(botName: string): number {
		const bot = this.bots.get(botName);
		if (!bot) {
			logger.warn(`[BotRegistry] Attempted to get frequency for non-existent bot: ${botName}`);
			return 0;
		}
		const rate = bot.getResponseRate();
		logger.debug(`[BotRegistry] Retrieved response rate for ${botName}: ${rate}%`);
		return rate;
	}
}
