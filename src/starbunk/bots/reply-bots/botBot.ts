import ReplyBot from '@/starbunk/bots/replyBot';
import Random from '@/utils/random';
import { WebhookService } from '@/webhooks/webhookService';
import { Message, TextChannel } from 'discord.js';

export default class BotBot extends ReplyBot {
	constructor(webhookService: WebhookService) {
		super(webhookService);
	}
	private readonly botName = 'BotBot';
	private readonly avatarUrl = 'https://cdn-icons-png.flaticon.com/512/4944/4944377.png';
	private readonly response: string = 'Hello fellow bot!';

	getBotName(): string {
		return this.botName;
	}

	getAvatarUrl(): string {
		return this.avatarUrl;
	}

	handleMessage(message: Message<boolean>): void {
		if (!message.author.bot || this.isSelf(message)) return;

		this.sendReply(message.channel as TextChannel, message.content);
	}

	handleRandomMessage(message: Message<boolean>): void {
		if (this.isSelf(message)) return;

		if (message.author.bot && Random.percentChance(10)) {
			this.sendReply(message.channel as TextChannel, this.response);
		}
	}
}
