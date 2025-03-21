import { BotIdentity } from '@/starbunk/types/botIdentity';
import { Message, TextChannel } from 'discord.js';
import { getWebhookService } from '../../services/bootstrap';
import { logger } from '../../services/logger';
export default abstract class ReplyBot {
	private defaultBotIdentity: BotIdentity = {
		avatarUrl: 'https://imgur.com/a/qqUlTxI',
		botName: 'BunkBot'
	};

	public get defaultBotName(): string {
		return 'CovaBot';
	}

	public get botIdentity(): BotIdentity {
		return this.defaultBotIdentity;
	}

	public abstract handleMessage(message: Message): Promise<void>;

	protected async sendReply(channel: TextChannel, content: string): Promise<void> {
		try {
			let webhookService;
			try {
				webhookService = getWebhookService();
			} catch (error) {
				logger.error('Failed to get WebhookService', error as Error);
				throw new Error('WebhookService not available');
			}

			await webhookService.writeMessage(channel, {
				username: this.botIdentity.botName,
				avatarURL: this.botIdentity.avatarUrl,
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
}
