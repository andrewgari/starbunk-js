import { Message, TextChannel } from 'discord.js';
import { WebhookService } from '../../../webhooks/webhookService';
import { BotIdentity, CompositeTrigger, PatternTrigger, StaticResponse } from '../botTypes';
import ReplyBot from '../replyBot';

export default class CheckBot extends ReplyBot {
	// Properties needed for the patchReplyBot helper
	botName = 'CheckBot';
	avatarUrl = 'https://m.media-amazon.com/images/I/21Unzn9U8sL._AC_.jpg';

	private readonly czechPattern = /\bczech\b/i;
	private readonly chezhPattern = /\bchezh\b/i;
	private readonly czechResponse = "I believe you mean 'check'.";
	private readonly chezhResponse = "I believe you mean 'czech'.";

	constructor(webhookService: WebhookService) {
		const identity: BotIdentity = {
			name: 'CheckBot',
			avatarUrl: 'https://m.media-amazon.com/images/I/21Unzn9U8sL._AC_.jpg'
		};

		const czechTrigger = new PatternTrigger(/\bczech\b/i);
		const chezhTrigger = new PatternTrigger(/\bchezh\b/i);
		const trigger = new CompositeTrigger([czechTrigger, chezhTrigger]);

		// We'll use the default response generator but override handleMessage
		const responseGenerator = new StaticResponse("");

		super(identity, trigger, responseGenerator, webhookService);
	}

	// These methods are kept for backward compatibility
	getBotName(): string {
		return this.botName;
	}

	getAvatarUrl(): string {
		return this.avatarUrl;
	}

	async handleMessage(message: Message<boolean>): Promise<void> {
		if (message.author.bot) return;

		if (message.content.match(this.czechPattern)) {
			await this.sendReply(message.channel as TextChannel, this.czechResponse);
		} else if (message.content.match(this.chezhPattern)) {
			await this.sendReply(message.channel as TextChannel, this.chezhResponse);
		}
	}
}
