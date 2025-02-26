import { Message, TextChannel } from 'discord.js';
import { WebhookService } from '../../../webhooks/webhookService';
import { BotIdentity, PatternTrigger, StaticResponse } from '../botTypes';
import ReplyBot from '../replyBot';

export default class ChaosBot extends ReplyBot {
	// Properties needed for the patchReplyBot helper
	botName: string;
	avatarUrl: string;
	private readonly pattern = /\bchaos\b/i;
	private readonly response = "All I know is...I'm here to kill Chaos";

	constructor(webhookService: WebhookService) {
		const identity: BotIdentity = {
			name: 'ChaosBot',
			avatarUrl: 'https://preview.redd.it/md0lzbvuc3571.png?width=1920&format=png&auto=webp&s=ff403a8d4b514af8d99792a275d2c066b8d1a4de'
		};

		const trigger = new PatternTrigger(/\bchaos\b/i);
		const responseGenerator = new StaticResponse("All I know is...I'm here to kill Chaos");

		super(identity, trigger, responseGenerator, webhookService);

		// Initialize properties for the patchReplyBot helper
		this.botName = identity.name;
		this.avatarUrl = identity.avatarUrl;
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
