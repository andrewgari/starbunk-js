import { logger, ensureError } from '@starbunk/shared';
import { getBotDefaults } from './config/botDefaults';
import { BaseVoiceBot } from './core/voice-bot-adapter';
import { ReplyBotImpl } from './core/bot-builder';
import { BotDiscovery } from './core/BotDiscovery';

type Bot = ReplyBotImpl | BaseVoiceBot;

export class BotRegistry {
	private static instance = new BotRegistry();
	private bots = new Map<string, Bot>();
	private replyBots = new Map<string, ReplyBotImpl>();
	private voiceBots = new Map<string, BaseVoiceBot>();
	private botStates = new Map<string, boolean>();

	private constructor() {}

	public static getInstance(): BotRegistry {
		return BotRegistry.instance;
	}

	public static reset(): void {
		logger.debug('[BotRegistry] Resetting singleton instance');
		BotRegistry.instance = new BotRegistry();
	}

	public static async discoverBots(): Promise<ReplyBotImpl[]> {
		logger.info('[BotRegistry] Discovering reply bots...');
		const registry = BotRegistry.getInstance();

		try {
			const discovery = new BotDiscovery();
			const _result = await discovery.discoverBots();

			// Register discovered bots
			for (const bot of _result.bots) {
				registry.registerBot(bot);
			}

			// Log results
			if (_result.bots.length > 0) {
				logger.info(`[BotRegistry] Successfully loaded ${_result.bots.length} reply bots`);
				_result.bots.forEach((bot) => logger.info(`   - ${bot.name}`));
			} else {
				logger.warn('[BotRegistry] No reply bots discovered');
			}

			// Log any errors
			if (_result.errors.length > 0) {
				logger.warn(`[BotRegistry] Failed to load ${_result.errors.length} bots`);
				_result.errors.forEach(({ directory, error }) => {
					logger.debug(`   - ${directory}: ${error.message}`);
				});
			}

			return _result.bots;
		} catch (error) {
			logger.error('[BotRegistry] Critical error discovering reply bots:', ensureError(error));
			return [];
		}
	}

	public registerBot(bot: Bot): void {
		const botName = this.getBotName(bot);
		this.bots.set(botName, bot);

		if (this.isReplyBot(bot)) {
			this.replyBots.set(botName, bot);
			logger.debug(`[BotRegistry] Registered reply bot: ${botName}`);
		} else if (bot instanceof BaseVoiceBot) {
			this.voiceBots.set(botName, bot);
			logger.debug(`[BotRegistry] Registered voice bot: ${botName}`);
		}

		const defaults = getBotDefaults();
		this.botStates.set(botName, defaults.enabled);
	}

	public enableBot(botName: string): boolean {
		if (!this.bots.has(botName)) {
			logger.warn(`[BotRegistry] Cannot enable non-existent bot: ${botName}`);
			return false;
		}
		this.botStates.set(botName, true);
		logger.info(`[BotRegistry] Enabled bot: ${botName}`);
		return true;
	}

	public disableBot(botName: string): boolean {
		if (!this.bots.has(botName)) {
			logger.warn(`[BotRegistry] Cannot disable non-existent bot: ${botName}`);
			return false;
		}
		this.botStates.set(botName, false);
		logger.info(`[BotRegistry] Disabled bot: ${botName}`);
		return true;
	}

	public isBotEnabled(botName: string): boolean {
		return this.botStates.get(botName) ?? false;
	}

	public setBotFrequency(botName: string, rate: number): boolean {
		const bot = this.replyBots.get(botName);
		if (!bot?.metadata) {
			logger.warn(`[BotRegistry] Cannot set frequency for bot: ${botName}`);
			return false;
		}

		try {
			bot.metadata.responseRate = rate;
			logger.info(`[BotRegistry] Set response rate for ${botName} to ${rate}%`);
			return true;
		} catch (error) {
			logger.error(`[BotRegistry] Error setting response rate for ${botName}:`, ensureError(error));
			return false;
		}
	}

	public getBotFrequency(botName: string): number {
		const bot = this.replyBots.get(botName);
		if (!bot) {
			logger.warn(`[BotRegistry] Cannot get frequency for non-existent bot: ${botName}`);
			return 0;
		}

		const rate = bot.metadata?.responseRate ?? 100;
		logger.debug(`[BotRegistry] Response rate for ${botName}: ${rate}%`);
		return rate;
	}

	// Getters
	public getReplyBot(botName: string): ReplyBotImpl | undefined {
		return this.replyBots.get(botName);
	}

	public getVoiceBot(botName: string): BaseVoiceBot | undefined {
		return this.voiceBots.get(botName);
	}

	public getReplyBotNames(): string[] {
		return Array.from(this.replyBots.keys());
	}

	public getVoiceBotNames(): string[] {
		return Array.from(this.voiceBots.keys());
	}

	public getAllBotNames(): string[] {
		return [...this.replyBots.keys(), ...this.voiceBots.keys()];
	}

	private getBotName(bot: Bot): string {
		return bot.name;
	}

	private isReplyBot(bot: Bot): bot is ReplyBotImpl {
		return (
			'shouldRespond' in bot &&
			'processMessage' in bot &&
			typeof (bot as ReplyBotImpl).shouldRespond === 'function'
		);
	}
}
