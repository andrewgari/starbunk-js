import { Message, TextChannel } from 'discord.js';
import { getWebhookService } from '../../services/bootstrap';
import { logger } from '../../services/logger';

export default abstract class ReplyBot {
	abstract botName: string;
	protected abstract avatarUrl: string;

	async handleMessage(message: Message): Promise<void> {
		if (message.author.bot) {
			logger.debug(`${this.botName} ignoring bot message: ${message.content}`);
			return;
		}
		logger.debug(`${this.botName} received message: ${message.content}`);
	}

	public async sendReply(channel: TextChannel, content: string): Promise<void> {
		try {
			const webhookService = getWebhookService();
			if (!webhookService) {
				throw new Error('WebhookService not found');
			}

			await webhookService.writeMessage(channel, {
				username: this.botName,
				avatarURL: this.avatarUrl,
				content: content,
				embeds: [],
			});
		} catch (error) {
			logger.error(`Failed to send reply to channel ${channel.id}`, error as Error);
		}
	}

	public isSelf(message: Message): boolean {
		return message.author.bot && message.author.id === message.client.user?.id;
	}
}
