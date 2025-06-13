import userId from '@/discord/userId';
import { BotIdentity } from '@/starbunk/types/botIdentity';
import { Message } from 'discord.js';
import { BotFrequencyService } from '../../services/botFrequencyService';
import { logger } from '../../services/logger';
import { percentChance } from '../../utils/random';
import { getBotDefaults } from '../config/botDefaults';

export default abstract class ReplyBot {
	protected skipBotMessages: boolean = true;
	protected responseRate: number = 100; // Default to 100%
	private commandSetResponseRate: number | null = null; // Track rate set by command

	constructor() {
		// Start with the global default
		const defaults = getBotDefaults();
		this.responseRate = defaults.responseRate;

		// Allow bot implementation to override with its own default
		this.initializeResponseRate();
	}

	/**
	 * Initialize response rate from bot-specific constants.
	 * Bot implementations can override this to set their own default rate.
	 */
	protected initializeResponseRate(): void {
		// Default implementation uses 100%
	}

	/**
	 * Get the default name for this bot. By default, returns the class name.
	 * Can be overridden if a different name is needed.
	 */
	public get defaultBotName(): string {
		return this.constructor.name;
	}

	/**
	 * Get the description for this bot.
	 * Should be overridden by child classes to provide a meaningful description.
	 */
	public get description(): string {
		return "A Starbunk reply bot";
	}

	public abstract get botIdentity(): BotIdentity;

	/**
	 * Set the response rate for this bot via command.
	 * This takes highest priority and is stored in the database.
	 * @param rate The response rate (0-100)
	 * @throws Error if rate is invalid
	 */
	public async setResponseRate(rate: number): Promise<void> {
		if (rate < 0 || rate > 100) {
			throw new Error(`Invalid response rate: ${rate}. Must be between 0 and 100.`);
		}

		try {
			await BotFrequencyService.getInstance().setBotFrequency(this.defaultBotName, rate);
			logger.info(`[${this.defaultBotName}] Response rate set to ${rate}%`);
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error setting response rate:`, error instanceof Error ? error : new Error(String(error)));
			throw error;
		}
	}

	/**
	 * Get the current effective response rate for this bot.
	 * Priority order:
	 * 1. Database stored rate (from command)
	 * 2. Bot's own default (from initializeResponseRate)
	 * @returns The response rate (0-100)
	 */
	public async getResponseRate(): Promise<number> {
		try {
			// Get rate from database (returns 100 if not set)
			const rate = await BotFrequencyService.getInstance().getBotFrequency(this.defaultBotName);
			return rate;
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error getting response rate:`, error instanceof Error ? error : new Error(String(error)));
			return this.responseRate; // Fall back to bot's default rate
		}
	}

	/**
	 * Reset the response rate to the bot's default.
	 * This removes any command-set rate from the database.
	 */
	public async resetResponseRate(): Promise<void> {
		try {
			await BotFrequencyService.getInstance().resetBotFrequency(this.defaultBotName);
			logger.info(`[${this.defaultBotName}] Response rate reset to default ${this.responseRate}%`);
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error resetting response rate:`, error instanceof Error ? error : new Error(String(error)));
			throw error;
		}
	}

	/**
	 * Check if we should process this message based on response rate
	 */
	protected async shouldProcessMessage(): Promise<boolean> {
		const rate = await this.getResponseRate();
		const shouldProcess = percentChance(rate);
		logger.debug(`[${this.defaultBotName}] Response rate check (${rate}%): ${shouldProcess}`);
		return shouldProcess;
	}

	public async auditMessage(message: Message): Promise<void> {
		logger.debug(`[${this.defaultBotName}] Auditing message from ${message.author.tag}`);

		// Early return if message should be skipped
		if (this.shouldSkipMessage(message)) {
			logger.debug(`[${this.defaultBotName}] Skipping message from ${message.author.tag} (shouldSkipMessage=true)`);
			return;
		}

		try {
			await this.handleMessage(message);
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error handling message`, error instanceof Error ? error : new Error(String(error)));
			logger.debug(`[${this.defaultBotName}] Message content that caused error: "${message.content.substring(0, 100)}..."`);
		}
	}

	/**
	 * Determines if a message should be skipped based on bot settings.
	 * Can be overridden by child classes for custom skip logic.
	 */
	protected shouldSkipMessage(message: Message): boolean {
		if (this.skipBotMessages && message.author.bot) {
			return true;
		}
		if (message.author.id === userId.Ian) {
			return true;
		}
		return false;
	}

	/**
	 * Handles the message processing. Child classes should implement this method
	 * to define their specific message handling logic.
	 */
	protected abstract processMessage(message: Message): Promise<void>;

	/**
	 * Main message handling method. This should not be overridden by child classes.
	 * Instead, override processMessage() for custom handling logic.
	 */
	public async handleMessage(message: Message): Promise<void> {
		try {
			// Check response rate first
			if (!await this.shouldProcessMessage()) {
				return;
			}

			await this.processMessage(message);
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error in handleMessage:`, error instanceof Error ? error : new Error(String(error)));
			throw error;
		}
	}

	/**
	 * Determines if a message is from this bot.
	 */
	public isSelf(message: Message): boolean {
		const isSelf = message.author.bot && message.author.id === message.client.user?.id;
		logger.debug(`[${this.defaultBotName}] Checking if message is from self: ${isSelf}`);
		return isSelf;
	}

	public isBot(message: Message): boolean {
		const isBot = message.author.bot;
		logger.debug(`[${this.defaultBotName}] Checking if message is from bot: ${isBot}`);
		return isBot;
	}
}
