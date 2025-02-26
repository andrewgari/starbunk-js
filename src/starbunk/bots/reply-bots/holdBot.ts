import { Message, TextChannel } from 'discord.js';
import { WebhookService } from '../../../webhooks/webhookService';
import { BotIdentity, PatternTrigger, StaticResponse } from '../botTypes';
import ReplyBot from '../replyBot';

export default class HoldBot extends ReplyBot {
	private readonly botName = 'HoldBot';
	private readonly avatarUrl = 'https://i.imgur.com/YPFGEzM.png';
	private readonly pattern = /\bhold\b/i;
	private readonly response = 'Hold.';

	constructor(webhookService: WebhookService) {
		const identity: BotIdentity = {
			name: 'HoldBot',
			avatarUrl: 'https://i.imgur.com/YPFGEzM.png'
		};

		const trigger = new PatternTrigger(/\bhold\b/i);
		const responseGenerator = new StaticResponse('Hold.');

		super(identity, trigger, responseGenerator, webhookService);
	}

	getBotName(): string {
		return this.botName;
	}

	getAvatarUrl(): string {
		return this.avatarUrl;
	}

	async handleMessage(message: Message<boolean>): Promise<void> {
		if (message.author.bot) return;

		if (message.content.match(this.pattern)) {
			await this.sendReply(message.channel as TextChannel, this.response);
		}
	}
}
