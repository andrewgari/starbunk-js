import { Message, TextChannel } from 'discord.js';
import { WebhookService } from '../../../webhooks/webhookService';
import { BotIdentity, PatternTrigger, StaticResponse } from '../botTypes';
import ReplyBot from '../replyBot';

export default class MusicCorrectBot extends ReplyBot {
	private readonly botName = 'Music Correct Bot';
	private readonly pattern = /^[!?]play\b/;
	private readonly response = "Hey! The play command has changed. Use '/play' instead! 🎵";

	constructor(webhookService: WebhookService) {
		const identity: BotIdentity = {
			name: 'Music Correct Bot',
			avatarUrl: ''
		};

		const trigger = new PatternTrigger(/^[!?]play\b/);
		const responseGenerator = new StaticResponse("Hey! The play command has changed. Use '/play' instead! 🎵");

		super(identity, trigger, responseGenerator, webhookService);
	}

	getBotName(): string {
		return this.botName;
	}

	getAvatarUrl(): string {
		return '';
	}

	async handleMessage(message: Message<boolean>): Promise<void> {
		if (message.author.bot) return;

		if (message.content.match(this.pattern)) {
			await this.sendReply(message.channel as TextChannel, this.response);
		}
	}
}
