import { Message, TextChannel } from 'discord.js';
import { Logger } from '../../../services/Logger';
import { WebhookService } from '../../../webhooks/webhookService';
import ReplyBot from '../replyBot';

export default class SheeshBot extends ReplyBot {
	constructor(webhookService: WebhookService) {
		super(webhookService);
	}
	private botName = 'Sheesh Bot';
	private readonly avatarUrl = 'https://i.imgflip.com/5fc2iz.png?a471000';

	private readonly defaultPattern = /\bshee+sh\b/i;

	generateRandomEs(): string {
		const numberOfEs = Math.floor(Math.random() * 10);
		return 'e'.repeat(numberOfEs) + 'e' + 'e';
	}

	getBotName(): string {
		return this.botName;
	}
	getAvatarUrl(): string {
		return this.avatarUrl;
	}
	response(): string {
		return 'Sh' + this.generateRandomEs() + 'sh!';
	}

	handleMessage(message: Message): void {
		if (message.author.bot) return;

		if (message.content.match(this.defaultPattern)) this.sendReply(message.channel as TextChannel, this.response());

		if (message.content.match(/\bsheesh\b/i)) {
			Logger.debug(`😤 User ${message.author.username} said sheesh in: "${message.content}"`);
			this.sendReply(message.channel as TextChannel, 'SHEEEEEEEESH 😤');
		}
	}
}
