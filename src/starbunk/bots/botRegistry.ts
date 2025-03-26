import { logger } from '../../services/logger';
import { BaseVoiceBot } from './core/voice-bot-adapter';
import ReplyBot from './replyBot';

type Bot = ReplyBot | BaseVoiceBot;

export class BotRegistry {
	private static instance = new BotRegistry();
	private botStates = new Map<string, boolean>();
	private bots = new Map<string, Bot>();
	private replyBots = new Map<string, ReplyBot>();
	private voiceBots = new Map<string, BaseVoiceBot>();

	public static getInstance(): BotRegistry {
		return BotRegistry.instance;
	}

	public registerBot(bot: Bot): void {
		const botName = this.getBotName(bot);
		this.bots.set(botName, bot);

		// Add to specific collection
		if (bot instanceof ReplyBot) {
			this.replyBots.set(botName, bot);
		} else if (bot instanceof BaseVoiceBot) {
			this.voiceBots.set(botName, bot);
		}

		// Initialize as enabled
		this.botStates.set(botName, true);

		// Log registration
		if (bot instanceof ReplyBot) {
			const rate = bot.getResponseRate();
			logger.debug(`[BotRegistry] Registered reply bot: ${botName} with response rate ${rate}%`);
		} else {
			logger.debug(`[BotRegistry] Registered voice bot: ${botName}`);
		}
	}

	private getBotName(bot: Bot): string {
		if (bot instanceof ReplyBot) {
			return bot.defaultBotName;
		}
		return bot.name;
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

	public getReplyBotNames(): string[] {
		return Array.from(this.replyBots.keys());
	}

	public getVoiceBotNames(): string[] {
		return Array.from(this.voiceBots.keys());
	}

	public setBotFrequency(botName: string, rate: number): boolean {
		const bot = this.replyBots.get(botName);
		if (!bot) {
			logger.warn(`[BotRegistry] Attempted to set frequency for non-existent reply bot: ${botName}`);
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
		const bot = this.replyBots.get(botName);
		if (!bot) {
			logger.warn(`[BotRegistry] Attempted to get frequency for non-existent reply bot: ${botName}`);
			return 0;
		}
		const rate = bot.getResponseRate();
		logger.debug(`[BotRegistry] Retrieved response rate for ${botName}: ${rate}%`);
		return rate;
	}

	public getBotDescription(botName: string): string {
		const bot = this.bots.get(botName);
		if (!bot) {
			logger.warn(`[BotRegistry] Attempted to get description for non-existent bot: ${botName}`);
			return "";
		}
		return bot instanceof ReplyBot ? bot.description : bot.description;
	}

	public getVoiceBot(botName: string): BaseVoiceBot | undefined {
		return this.voiceBots.get(botName);
	}

	public getReplyBot(botName: string): ReplyBot | undefined {
		return this.replyBots.get(botName);
	}

	/**
	 * Reset the singleton instance to a fresh state.
	 * This method should only be used in tests.
	 */
	public static reset(): void {
		logger.debug('[BotRegistry] Resetting singleton instance');
		BotRegistry.instance = new BotRegistry();
	}
}
