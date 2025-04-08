import { logger } from '../../services/logger';
import { getBotDefaults } from '../config/botDefaults';
import { BaseVoiceBot } from './core/voice-bot-adapter';
import ReplyBot from './replyBot';

// Define the Bot type as a union of ReplyBot and BaseVoiceBot
type Bot = ReplyBot | BaseVoiceBot;

export class BotRegistry {
	private static instance = new BotRegistry();
	private bots = new Map<string, Bot>();
	private replyBots = new Map<string, ReplyBot>();
	private voiceBots = new Map<string, BaseVoiceBot>();
	private botStates = new Map<string, boolean>();

	private constructor() { }

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

		// Initialize with defaults
		const defaults = getBotDefaults();
		this.botStates.set(botName, defaults.enabled);

		// Log registration
		if (bot instanceof ReplyBot) {
			logger.debug(`[BotRegistry] Registered reply bot: ${botName} (enabled: ${defaults.enabled})`);
		} else {
			logger.debug(`[BotRegistry] Registered voice bot: ${botName} (enabled: ${defaults.enabled})`);
		}
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
		return this.botStates.get(botName) ?? false;
	}

	public async setBotFrequency(botName: string, rate: number): Promise<boolean> {
		const bot = this.replyBots.get(botName);
		if (!bot) {
			logger.warn(`[BotRegistry] Attempted to set frequency for non-existent reply bot: ${botName}`);
			return false;
		}
		try {
			await bot.setResponseRate(rate);
			logger.info(`[BotRegistry] Set response rate for ${botName} to ${rate}%`);
			return true;
		} catch (error) {
			logger.error(`[BotRegistry] Error setting response rate for ${botName}:`, error instanceof Error ? error : new Error(String(error)));
			return false;
		}
	}

	public async getBotFrequency(botName: string): Promise<number> {
		const bot = this.replyBots.get(botName);
		if (!bot) {
			logger.warn(`[BotRegistry] Attempted to get frequency for non-existent reply bot: ${botName}`);
			return 0;
		}
		try {
			const rate = await bot.getResponseRate();
			logger.debug(`[BotRegistry] Retrieved response rate for ${botName}: ${rate}%`);
			return rate;
		} catch (error) {
			logger.error(`[BotRegistry] Error getting response rate for ${botName}:`, error instanceof Error ? error : new Error(String(error)));
			return 0;
		}
	}

	public getReplyBot(botName: string): ReplyBot | undefined {
		return this.replyBots.get(botName);
	}

	public getReplyBotNames(): string[] {
		return Array.from(this.replyBots.keys());
	}

	public getVoiceBotNames(): string[] {
		return Array.from(this.voiceBots.keys());
	}

	public getVoiceBot(botName: string): BaseVoiceBot | undefined {
		return this.voiceBots.get(botName);
	}

	public getAllBotNames(): string[] {
		return [...this.replyBots.keys(), ...this.voiceBots.keys()];
	}

	private getBotName(bot: Bot): string {
		return bot instanceof ReplyBot ? bot.defaultBotName : bot.name;
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
