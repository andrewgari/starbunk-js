import { Message, TextChannel } from 'discord.js';
import { WebhookService } from '../../../webhooks/webhookService';
import { BotIdentity, PatternTrigger, StaticResponse } from '../botTypes';
import ReplyBot from '../replyBot';

export default class NiceBot extends ReplyBot {
	private readonly botName = 'BunkBot';
	private readonly avatarUrl = 'https://pbs.twimg.com/profile_images/421461637325787136/0rxpHzVx.jpeg';
	private readonly pattern = /\b69|(sixty-?nine)\b/i;
	private readonly response = 'Nice.';

	constructor(webhookService: WebhookService) {
		const identity: BotIdentity = {
			name: 'BunkBot',
			avatarUrl: 'https://pbs.twimg.com/profile_images/421461637325787136/0rxpHzVx.jpeg'
		};

		const trigger = new PatternTrigger(/\b69|(sixty-?nine)\b/i);
		const responseGenerator = new StaticResponse('Nice.');

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
