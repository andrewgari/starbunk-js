import { WebhookService } from '@/webhooks/webhookService';
import { Message, TextChannel } from 'discord.js';

export default abstract class ReplyBot {
	abstract getBotName(): string;
	abstract getAvatarUrl(): string;
	abstract handleMessage(message: Message): void;
	constructor(private webhookService: WebhookService) {
		this.webhookService = webhookService;
	}
	sendReply(channel: TextChannel, response: string): void {
		this.webhookService.writeMessage(channel, {
			username: this.getBotName(),
			avatarURL: this.getAvatarUrl(),
			content: response,
			embeds: [],
		});
	}
	isSelf(message: Message): boolean {
		return message.author.bot && message.author.username === this.getBotName();
	}
}
