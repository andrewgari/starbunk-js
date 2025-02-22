import ReplyBot from '@/starbunk/bots/replyBot';
import { WebhookService } from '@/webhooks/webhookService';
import { Message, TextChannel } from 'discord.js';

export default class BabyBot extends ReplyBot {
	constructor(webhookService: WebhookService) {
		super(webhookService);
	}
	private readonly botName = 'BabyBot';
	private readonly avatarUrl = 'https://i.redd.it/qc9qus78dc581.jpg';
	private readonly pattern = /\b(baby)\b/i;
	private readonly response = 'https://media.tenor.com/NpnXNhWqKcwAAAAC/metroid-samus-aran.gif';

	getBotName(): string {
		return this.botName;
	}
	getAvatarUrl(): string {
		return this.avatarUrl;
	}
	handleMessage(message: Message<boolean>): void {
		if (message.author.bot) return;

		if (message.content.match(this.pattern)) {
			this.sendReply(message.channel as TextChannel, this.response);
		}
	}
}
