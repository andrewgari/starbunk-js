import { Message, TextChannel } from 'discord.js';
import { MessageInfo } from '../../discord/messageInfo';
import webhookService, { WebhookService } from '../../webhooks/webhookService';

export default abstract class ReplyBot {
	abstract getBotName(): string;
	abstract getAvatarUrl(): string;
	abstract handleMessage(message: Message): void;

	protected webhookService: WebhookService;

	constructor(param: WebhookService | unknown = webhookService) {
		// If param is a WebhookService, use it directly
		// Otherwise, use the default webhookService
		this.webhookService = param instanceof WebhookService ? param : webhookService;
	}

	// Create message options for better testability
	getMessageOptions(content: string): MessageInfo {
		return {
			username: this.getBotName(),
			avatarURL: this.getAvatarUrl(),
			content,
			embeds: [],
		};
	}

	async sendReply(channel: TextChannel, response: string): Promise<void> {
		const messageOptions = this.getMessageOptions(response);
		await this.webhookService.writeMessage(channel, messageOptions);
	}

	isSelf(message: Message): boolean {
		return message.author.bot && message.author.username === this.getBotName();
	}
}
