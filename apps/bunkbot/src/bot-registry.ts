import { logger } from '@starbunk/shared';
import { getBotDefaults } from './config/bot-defaults';
import { BaseVoiceBot } from './core/voice-bot-adapter';
import fs from 'fs';
import path from 'path';
import { ReplyBotImpl } from './core/bot-builder';

// Define the Bot type as a union of ReplyBotImpl and BaseVoiceBot
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

	/**
	 * Reset the singleton instance to a fresh state.
	 * This method should only be used in tests.
	 */
	public static reset(): void {
		logger.debug('[BotRegistry] Resetting singleton instance');
		BotRegistry.instance = new BotRegistry();
	}

	/**
	 * Automatically discover and load all reply bots from the reply-bots directory
	 * @returns Array of loaded reply bots
	 */
	public static async discoverBots(): Promise<ReplyBotImpl[]> {
		logger.info('[BotRegistry] Discovering reply bots...');
		const loadedBots: ReplyBotImpl[] = [];
		const registry = BotRegistry.getInstance();

		try {
			// Path to the reply-bots directory
			const replyBotsDir = path.join(__dirname, 'reply-bots');

			// Get all subdirectories (each should be a bot)
			const botDirs = fs
				.readdirSync(replyBotsDir, { withFileTypes: true })
				.filter(
					(dirent) =>
						dirent.isDirectory() &&
						!dirent.name.startsWith('.') &&
						dirent.name !== 'dist' &&
						dirent.name !== 'node_modules',
				)
				.map((dirent) => dirent.name);

			logger.debug(`[BotRegistry] Found ${botDirs.length} potential bot directories`);

			// Load each bot
			for (const botDir of botDirs) {
				// Declare variables outside the try block so they're accessible in the catch block
				let botPath = '';
				let absolutePath = '';

				try {
					// Import the bot module
					botPath = path.join(replyBotsDir, botDir);
					const indexPath = path.join(botPath, 'index.ts');
					const jsIndexPath = path.join(botPath, 'index.js');

					// Check if index file exists
					if (!fs.existsSync(indexPath) && !fs.existsSync(jsIndexPath)) {
						logger.warn(`[BotRegistry] No index file found for bot in directory: ${botDir}`);
						continue;
					}

					// Import the bot
					// Determine which file to import (index.ts or index.js)
					const importPath = fs.existsSync(indexPath) ? indexPath : jsIndexPath;

					// Use path.resolve to get an absolute path
					absolutePath = path.resolve(importPath);

					// Validate that the file exists before attempting to import
					if (!fs.existsSync(absolutePath)) {
						throw new Error(`File does not exist: ${absolutePath}`);
					}

					// Log the path we're trying to import from
					logger.debug(`[BotRegistry] Attempting to import bot from: ${absolutePath}`);

					// Import the bot module using a relative path that works with both TypeScript and JavaScript
					// This approach avoids using file:// URLs which can cause issues with require() in the compiled JS
					const botModule = await import(absolutePath);
					const bot = botModule.default;

					// Validate the bot
					if (!bot || typeof bot !== 'object') {
						logger.warn(`[BotRegistry] Invalid bot module in directory: ${botDir}`);
						continue;
					}

					// Check if it's a valid ReplyBotImpl
					if (!this.validateBot(bot)) {
						logger.warn(`[BotRegistry] Invalid bot implementation in directory: ${botDir}`);
						continue;
					}

					// Register the bot directly (no adaptation needed)
					registry.registerBot(bot);
					loadedBots.push(bot);
					logger.debug(`[BotRegistry] Successfully loaded bot: ${bot.name} from ${botDir}`);
				} catch (error) {
					// Enhanced error handling with more specific information
					const errorMessage = error instanceof Error ? error.message : String(error);
					const errorStack = error instanceof Error ? error.stack : '';

					logger.error(
						`[BotRegistry] Failed to load bot from directory: ${botDir}`,
						error instanceof Error ? error : new Error(String(error)),
					);

					// Log additional details to help with debugging
					logger.debug(`[BotRegistry] Error details for ${botDir}:
  - Message: ${errorMessage}
  - Type: ${error instanceof Error ? error.constructor.name : typeof error}
  - Path: ${botPath}
  - Attempted import path: ${absolutePath}
  - Stack: ${errorStack || 'No stack trace available'}`);
				}
			}

			// Log summary
			if (loadedBots.length > 0) {
				logger.info(`[BotRegistry] Successfully discovered and loaded ${loadedBots.length} reply bots`);
				logger.info('[BotRegistry] Reply bots summary:');
				loadedBots.forEach((bot) => {
					logger.info(`   - ${bot.name}`);
				});
			} else {
				logger.warn('[BotRegistry] No reply bots were discovered');
			}
		} catch (error) {
			// Enhanced error handling for critical errors
			const errorMessage = error instanceof Error ? error.message : String(error);
			const errorStack = error instanceof Error ? error.stack : '';

			logger.error(
				'[BotRegistry] Critical error discovering reply bots:',
				error instanceof Error ? error : new Error(String(error)),
			);

			// Log additional details to help with debugging
			logger.debug(`[BotRegistry] Critical error details:
  - Message: ${errorMessage}
  - Type: ${error instanceof Error ? error.constructor.name : typeof error}
  - Stack: ${errorStack || 'No stack trace available'}`);
		}

		return loadedBots;
	}

	/**
	 * Validate if an object is a valid ReplyBotImpl
	 * @param bot Object to validate
	 * @returns true if valid, false otherwise
	 */
	private static validateBot(bot: unknown): bot is ReplyBotImpl {
		if (!bot || typeof bot !== 'object') {
			return false;
		}

		const requiredProps = {
			name: 'string',
			description: 'string',
			processMessage: 'function',
			shouldRespond: 'function',
		} as const;

		const missingProps = Object.entries(requiredProps).filter(([prop, type]) => {
			const value = (bot as Record<string, unknown>)[prop];
			return typeof value !== type;
		});

		return missingProps.length === 0;
	}

	public registerBot(bot: Bot): void {
		const botName = this.getBotName(bot);
		this.bots.set(botName, bot);

		// Add to specific collection
		if (this.isReplyBot(bot)) {
			this.replyBots.set(botName, bot);
		} else if (bot instanceof BaseVoiceBot) {
			this.voiceBots.set(botName, bot);
		}

		// Initialize with defaults
		const defaults = getBotDefaults();
		this.botStates.set(botName, defaults.enabled);

		// Log registration
		if (this.isReplyBot(bot)) {
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
			// ReplyBotImpl uses metadata to track response rate
			if (bot.metadata) {
				bot.metadata.responseRate = rate;
			}
			logger.info(`[BotRegistry] Set response rate for ${botName} to ${rate}%`);
			return true;
		} catch (error) {
			logger.error(
				`[BotRegistry] Error setting response rate for ${botName}:`,
				error instanceof Error ? error : new Error(String(error)),
			);
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
			const rate = bot.metadata?.responseRate ?? 100;
			logger.debug(`[BotRegistry] Retrieved response rate for ${botName}: ${rate}%`);
			return rate;
		} catch (error) {
			logger.error(
				`[BotRegistry] Error getting response rate for ${botName}:`,
				error instanceof Error ? error : new Error(String(error)),
			);
			return 0;
		}
	}

	public getReplyBot(botName: string): ReplyBotImpl | undefined {
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
		return this.isReplyBot(bot) ? bot.name : bot.name;
	}

	/**
	 * Type guard to check if a bot is a ReplyBotImpl
	 */
	private isReplyBot(bot: Bot): bot is ReplyBotImpl {
		return (
			'shouldRespond' in bot &&
			'processMessage' in bot &&
			typeof (bot as ReplyBotImpl).shouldRespond === 'function'
		);
	}
}
