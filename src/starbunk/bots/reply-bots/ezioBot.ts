import { Message, TextChannel } from 'discord.js';
import { WebhookService } from '../../../webhooks/webhookService';
import { BotIdentity, PatternTrigger, ResponseGenerator } from '../botTypes';
import ReplyBot from '../replyBot';

// Custom response generator for Ezio
class EzioResponseGenerator implements ResponseGenerator {
	async generateResponse(message: Message): Promise<string> {
		return `Remember ${message.author.displayName}, Nothing is true; Everything is permitted.`;
	}
}

export default class EzioBot extends ReplyBot {
	readonly botName = 'Ezio Auditore Da Firenze';
	readonly avatarUrl = 'https://www.creativeuncut.com/gallery-12/art/ac2-ezio5.jpg';
	private readonly pattern = /\bezio|h?assassin.*\b/i;

	constructor(webhookService: WebhookService) {
		const identity: BotIdentity = {
			name: 'Ezio Auditore Da Firenze',
			avatarUrl: 'https://www.creativeuncut.com/gallery-12/art/ac2-ezio5.jpg'
		};

		const trigger = new PatternTrigger(/\bezio|h?assassin.*\b/i);
		const responseGenerator = new EzioResponseGenerator();

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
			await this.sendReply(
				message.channel as TextChannel,
				`Remember ${message.author.displayName}, Nothing is true; Everything is permitted.`,
			);
		}
	}
}
