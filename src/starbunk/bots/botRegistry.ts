import { logger } from '../../services/logger';
import ReplyBot from './replyBot';

export class BotRegistry {
	private static instance: BotRegistry;
	private botStates: Map<string, boolean> = new Map();
	private bots: Map<string, ReplyBot> = new Map();

	private constructor() { }

	public static getInstance(): BotRegistry {
		if (!BotRegistry.instance) {
			BotRegistry.instance = new BotRegistry();
		}
		return BotRegistry.instance;
	}

	public registerBot(bot: ReplyBot): void {
		const botName = bot.defaultBotName;
		this.bots.set(botName, bot);
		// Initialize as enabled
		this.botStates.set(botName, true);
		logger.debug(`[BotRegistry] Registered bot: ${botName}`);
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
		return Array.from(this.bots.keys());
	}
}
