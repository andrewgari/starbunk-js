import ReplyBot from '@/starbunk/bots/replyBot';
import { WebhookService } from '@/webhooks/webhookService';
import { Message, TextChannel } from 'discord.js';

export default class MusicCorrectBot extends ReplyBot {
	constructor(webhookService: WebhookService) {
		super(webhookService);
	}

	private readonly botName = 'Music Correct Bot';
	private readonly pattern = /^[!?]play\b/;
	private readonly response = "Hey! The play command has changed. Use '/play' instead! 🎵";

	getBotName(): string {
		return this.botName;
	}

	getAvatarUrl(): string {
		return '';
	}

	handleMessage(message: Message<boolean>): void {
		if (message.author.bot) return;

		if (message.content.match(this.pattern)) {
			this.sendReply(message.channel as TextChannel, this.response);
		}
	}
}
