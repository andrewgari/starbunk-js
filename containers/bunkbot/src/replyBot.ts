import { Message } from 'discord.js';
import { logger } from '@starbunk/shared';
import { BotIdentity } from './types/botIdentity';

/**
 * Abstract base class for all reply bots.
 * Provides common functionality for message processing, response rate management, and bot identity.
 */
export default abstract class ReplyBot {
	protected responseRate: number = 100; // Default 100% response rate

	/**
	 * Get the default bot name
	 */
	abstract get defaultBotName(): string;

	/**
	 * Get the bot description
	 */
	abstract get description(): string;

	/**
	 * Get the bot identity (name and avatar)
	 */
	abstract get botIdentity(): BotIdentity;

	/**
	 * Process a message and potentially respond
	 * @param message Discord message to process
	 */
	protected abstract processMessage(message: Message): Promise<void>;

	/**
	 * Determine if this bot should respond to a message
	 * @param message Discord message to evaluate
	 * @returns true if the bot should respond
	 */
	public async shouldRespond(message: Message): Promise<boolean> {
		try {
			// Check response rate (random chance)
			if (Math.random() * 100 > this.responseRate) {
				logger.debug(`[${this.defaultBotName}] Skipped due to response rate (${this.responseRate}%)`);
				return false;
			}

			// Subclasses can override this method for more complex logic
			return await this.shouldRespondToMessage(message);
		} catch (error) {
			logger.error(
				`[${this.defaultBotName}] Error checking if should respond:`,
				error instanceof Error ? error : new Error(String(error))
			);
			return false;
		}
	}

	/**
	 * Override this method to implement custom response logic
	 * @param message Discord message to evaluate
	 * @returns true if the bot should respond
	 */
	protected async shouldRespondToMessage(message: Message): Promise<boolean> {
		// Default implementation - always respond (subject to response rate)
		return true;
	}

	/**
	 * Public method to process a message (calls protected processMessage)
	 * @param message Discord message to process
	 * @returns Promise that resolves when processing is complete
	 */
	public async processMessagePublic(message: Message): Promise<void> {
		try {
			await this.processMessage(message);
		} catch (error) {
			logger.error(
				`[${this.defaultBotName}] Error processing message:`,
				error instanceof Error ? error : new Error(String(error))
			);
		}
	}

	/**
	 * Set the response rate for this bot
	 * @param rate Response rate as a percentage (0-100)
	 */
	public async setResponseRate(rate: number): Promise<void> {
		if (rate < 0 || rate > 100) {
			throw new Error('Response rate must be between 0 and 100');
		}
		this.responseRate = rate;
		logger.debug(`[${this.defaultBotName}] Response rate set to ${rate}%`);
	}

	/**
	 * Get the current response rate for this bot
	 * @returns Response rate as a percentage (0-100)
	 */
	public async getResponseRate(): Promise<number> {
		return this.responseRate;
	}
}
