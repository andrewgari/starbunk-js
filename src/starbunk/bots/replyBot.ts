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
		// Early return if message should be skipped
		if (this.shouldSkipMessage(message)) {
			return;
		}

		await this.handleMessage(message);
	}

	protected async handleMessage(message: Message): Promise<void> {
		// Skip bot messages if skipBotMessages is true
		if (this.shouldSkipMessage(message)) {
			return;
		}

		await this.processMessage(message);
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
			return true;
		}

		// Skip messages from any bot if skipBotMessages is true
		if (this.skipBotMessages && message.author.bot) {
			return true;
		}

		return false;
	}

	protected async sendReply(channel: TextChannel, content: string): Promise<void> {
		try {
			const identity = this.botIdentity;

			if (!identity) {
				logger.error(`No bot identity available for ${this.defaultBotName}`);
				return;
			}

			let webhookService;
			try {
				webhookService = getWebhookService();
			} catch (error) {
				logger.error('Failed to get WebhookService', error as Error);
				throw new Error('WebhookService not available');
			}

			await webhookService.writeMessage(channel, {
				username: identity.botName,
				avatarURL: identity.avatarUrl,
				content: content,
				embeds: []
			});
		} catch (error) {
			logger.error(`Failed to send reply to channel ${channel.id}`, error as Error);
			throw error;
		}
	}

	public isSelf(message: Message): boolean {
		return message.author.bot && message.author.id === message.client.user?.id;
	}

	public isBot(message: Message): boolean {
		return message.author.bot;
	}
}
