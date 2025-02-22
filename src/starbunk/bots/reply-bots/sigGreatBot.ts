import { Message, TextChannel } from 'discord.js';
import { WebhookService } from '../../../webhooks/webhookService';
import ReplyBot from '../replyBot';

export default class SigBestBot extends ReplyBot {
	constructor(webhookService: WebhookService) {
		super(webhookService);
	}

	private readonly botName = 'SigBestBot';
	private readonly pattern = /\b(sig|siggles) is best\b/i;
	private readonly response = 'Man, Sig really is the best.';

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
