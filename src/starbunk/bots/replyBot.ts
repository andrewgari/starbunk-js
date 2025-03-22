import { BotIdentity } from '@/starbunk/types/botIdentity';
import { Message, TextChannel } from 'discord.js';
import { getWebhookService } from '../../services/bootstrap';
import { logger } from '../../services/logger';

export default abstract class ReplyBot {
	protected skipBotMessages: boolean = true;

	/**
	 * Get the default name for this bot. By default, returns the class name.
	 * Can be overridden if a different name is needed.
	 */
	public get defaultBotName(): string {
		return this.constructor.name;
	}

	public abstract get botIdentity(): BotIdentity | undefined;

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

	public async handleMessage(message: Message): Promise<void> {
		logger.debug(`[${this.defaultBotName}] Handling message from ${message.author.tag}`);

		// Skip bot messages if skipBotMessages is true
		if (this.shouldSkipMessage(message)) {
			logger.debug(`[${this.defaultBotName}] Skipping message from ${message.author.tag} (shouldSkipMessage=true)`);
			return;
		}

		try {
			await this.processMessage(message);
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error processing message`, error as Error);
			logger.debug(`[${this.defaultBotName}] Message content that caused error: "${message.content.substring(0, 100)}..."`);
		}
	}

	protected abstract processMessage(message: Message): Promise<void>;

	/**
	 * Check if a message should be skipped (e.g., from a bot)
	 * @param message The message to check
	 * @returns true if the message should be skipped, false otherwise
	 */
	protected shouldSkipMessage(message: Message): boolean {
		// Early reject if message is from self
		if (message.author.username === this.defaultBotName) {
			logger.debug(`[${this.defaultBotName}] Skipping message from self`);
			return true;
		}

		// Skip messages from any bot if skipBotMessages is true
		if (this.skipBotMessages && message.author.bot) {
			logger.debug(`[${this.defaultBotName}] Skipping message from bot (skipBotMessages=true)`);
			return true;
		}

		return false;
	}

	protected async sendReply(channel: TextChannel, content: string): Promise<void> {
		try {
			const identity = this.botIdentity;

			if (!identity) {
				logger.error(`[${this.defaultBotName}] No bot identity available`);
				return;
			}

			let webhookService;
			try {
				webhookService = getWebhookService();
				logger.debug(`[${this.defaultBotName}] Got webhook service successfully`);
			} catch (error) {
				logger.error(`[${this.defaultBotName}] Failed to get WebhookService`, error as Error);
				throw new Error('WebhookService not available');
			}

			logger.debug(`[${this.defaultBotName}] Sending reply to channel ${channel.name}: "${content.substring(0, 100)}..."`);
			await webhookService.writeMessage(channel, {
				username: identity.botName,
				avatarURL: identity.avatarUrl,
				content: content,
				embeds: []
			});
			logger.debug(`[${this.defaultBotName}] Reply sent successfully`);
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Failed to send reply to channel ${channel.id}`, error as Error);
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
