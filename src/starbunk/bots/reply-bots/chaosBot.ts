import ReplyBot from '@/starbunk/bots/replyBot';
import { WebhookService } from '@/webhooks/webhookService';
import { Message, TextChannel } from 'discord.js';

export default class ChaosBot extends ReplyBot {
	constructor(webhookService: WebhookService) {
		super(webhookService);
	}
	private readonly botName = 'ChaosBot';
	private readonly avatarUrl =
		'https://preview.redd.it/md0lzbvuc3571.png?width=1920&format=png&auto=webp&s=ff403a8d4b514af8d99792a275d2c066b8d1a4de';
	private readonly pattern = /\bchaos\b/i;
	private readonly response = "All I know is...I'm here to kill Chaos";

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
