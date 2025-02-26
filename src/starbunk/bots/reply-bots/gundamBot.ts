import { Message, TextChannel } from 'discord.js';
import { WebhookService } from '../../../webhooks/webhookService';
import { BotIdentity, PatternTrigger, StaticResponse } from '../botTypes';
import ReplyBot from '../replyBot';

// Custom GundamBot class that extends ReplyBot
export class GundamBot extends ReplyBot {
	// Properties needed for the patchReplyBot helper
	botName = 'GundamBot';
	avatarUrl = 'https://a1.cdn.japantravel.com/photo/41317-179698/1440x960!/tokyo-unicorn-gundam-statue-in-odaiba-179698.jpg';

	private readonly pattern = /\bg(u|a)ndam\b/i;
	private readonly response = 'That\'s the famous Unicorn Robot, "Gandum". There, I said it.';

	constructor(webhookService: WebhookService) {
		const identity: BotIdentity = {
			name: 'GundamBot',
			avatarUrl: 'https://a1.cdn.japantravel.com/photo/41317-179698/1440x960!/tokyo-unicorn-gundam-statue-in-odaiba-179698.jpg'
		};

		const trigger = new PatternTrigger(/\bg(u|a)ndam\b/i);
		const responseGenerator = new StaticResponse('That\'s the famous Unicorn Robot, "Gandum". There, I said it.');

		super(identity, trigger, responseGenerator, webhookService);
	}

	// Extract pattern matching logic for better testability
	shouldReplyToMessage(content: string): boolean {
		return !!content.match(this.pattern);
	}

	// Get the response for a message
	getResponseForMessage(content: string): string | null {
		return this.shouldReplyToMessage(content) ? this.response : null;
	}

	// Override handleMessage to ensure async behavior
	async handleMessage(message: Message): Promise<void> {
		if (message.author.bot) return;

		const response = this.getResponseForMessage(message.content);
		if (response) {
			await this.sendReply(message.channel as TextChannel, response);
		}
	}
}

// Factory function to create a GundamBot instance
export default function createGundamBot(webhookService: WebhookService): ReplyBot {
	return new GundamBot(webhookService);
}
