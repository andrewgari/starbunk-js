import { Message, TextChannel } from 'discord.js';
import { Logger } from '../../../services/Logger';
import { WebhookService } from '../../../webhooks/webhookService';
import ReplyBot from '../replyBot';

export default class MacaroniBot extends ReplyBot {
	constructor(webhookService: WebhookService) {
		super(webhookService);
	}

	private botName = 'Macaroni Bot';
	private readonly pattern = /\b(mac(aroni)?|pasta)\b/i;
	private readonly avatarUrl = 'https://i.imgur.com/fgbH6Xf.jpg';

	getBotName(): string {
		return this.botName;
	}

	getAvatarUrl(): string {
		return this.avatarUrl;
	}

	handleMessage(message: Message): void {
		if (message.author.bot) return;

		if (message.content.match(this.pattern)) {
			Logger.debug(`🍝 User ${message.author.username} mentioned macaroni: "${message.content}"`);
			this.sendReply(message.channel as TextChannel, '🍝 Did somebody say macaroni?');
		}
	}
}
