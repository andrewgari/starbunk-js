import { BotIdentity } from '@/starbunk/types/botIdentity';
import { Message, TextChannel } from 'discord.js';
import { getWebhookService } from '../../services/bootstrap';
import { logger } from '../../services/logger';
import { percentChance } from '../../utils/random';

export default abstract class ReplyBot {
	protected skipBotMessages: boolean = true;
	protected responseRate: number = 100; // Default to 100% response rate

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

	public abstract get botIdentity(): BotIdentity | undefined;

	/**
	 * Set the response rate for this bot.
	 * @param rate The response rate (0-100)
	 * @throws Error if rate is invalid
	 */
	public setResponseRate(rate: number): void {
		if (rate < 0 || rate > 100) {
			throw new Error(`Invalid response rate: ${rate}. Must be between 0 and 100.`);
		}
		this.responseRate = rate;
	}

	/**
	 * Get the current response rate for this bot.
	 * @returns The response rate (0-100)
	 */
	public getResponseRate(): number {
		return this.responseRate;
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
			logger.error(`[${this.defaultBotName}] Error handling message`, error as Error);
			logger.debug(`[${this.defaultBotName}] Message content that caused error: "${message.content.substring(0, 100)}..."`);
		}
	}

	/**
	 * Determines if a message should be skipped based on bot settings.
	 * Can be overridden by child classes for custom skip logic.
	 */
	protected shouldSkipMessage(message: Message): boolean {
		return this.skipBotMessages && message.author.bot;
	}

	/**
	 * Determines if the bot should respond based on its response rate.
	 * Will always return true in debug mode.
	 */
	protected shouldTriggerResponse(): boolean {
		const shouldTrigger = percentChance(this.responseRate);
		logger.debug(`[${this.defaultBotName}] Response rate check (${this.responseRate}%): ${shouldTrigger}`);
		return shouldTrigger;
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
			if (this.shouldSkipMessage(message)) {
				logger.debug(`[${this.defaultBotName}] Skipping message from ${message.author.tag} (shouldSkipMessage=true)`);
				return;
			}
			await this.processMessage(message);
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error in handleMessage:`, error as Error);
			throw error;
		}
	}

	/**
	 * Sends a reply to the specified channel using the bot's identity.
	 */
	protected async sendReply(channel: TextChannel, content: string): Promise<void> {
		if (!this.botIdentity) {
			throw new Error(`[${this.defaultBotName}] No bot identity configured`);
		}

		// Validate the bot identity
		const trimmedBotName = this.botIdentity.botName?.trim();
		const trimmedAvatarUrl = this.botIdentity.avatarUrl?.trim();

		if (!trimmedBotName || !trimmedAvatarUrl) {
			logger.warn(`[${this.defaultBotName}] Invalid bot identity detected: ${JSON.stringify(this.botIdentity)}`);

			// Create a valid identity with fallbacks
			const validIdentity: BotIdentity = {
				botName: this.botIdentity.botName || this.defaultBotName,
				avatarUrl: this.botIdentity.avatarUrl || 'https://i.imgur.com/NtfJZP5.png'
			};

			logger.info(`[${this.defaultBotName}] Using fallback identity: ${JSON.stringify(validIdentity)}`);

			try {
				await getWebhookService().writeMessage(channel, {
					...validIdentity,
					content
				});
			} catch (error) {
				logger.error(`[${this.defaultBotName}] Error sending reply with fallback identity:`, error as Error);
				throw error;
			}

			return;
		}

		// Use the bot's identity if valid
		try {
			await getWebhookService().writeMessage(channel, {
				...this.botIdentity,
				content
			});
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error sending reply:`, error as Error);
			throw error;
		}
	}

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
