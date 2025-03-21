import { BotIdentity } from '@/starbunk/types/botIdentity';
import { Message, TextChannel } from 'discord.js';
import { getWebhookService } from '../../services/bootstrap';
import { logger } from '../../services/logger';

export default abstract class ReplyBot {
	private defaultBotIdentity: BotIdentity = {
		avatarUrl: 'https://imgur.com/a/qqUlTxI',
		botName: 'BunkBot'
	};

	protected skipBotMessages: boolean = true;

	public abstract get defaultBotName(): string;
	public abstract get botIdentity(): BotIdentity | undefined;

	public abstract handleMessage(message: Message): Promise<void>;

	/**
	 * Check if a message should be skipped (e.g., from a bot)
	 * @param message The message to check
	 * @returns true if the message should be skipped, false otherwise
	 */
	protected shouldSkipMessage(message: Message): boolean {
		return this.skipBotMessages && message.author.bot;
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
