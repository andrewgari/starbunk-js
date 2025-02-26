import { Message } from 'discord.js';
import { Logger } from '../../../services/logger';
import { WebhookService } from '../../../webhooks/webhookService';
import { BotIdentity, CompositeTrigger, PatternTrigger, ResponseGenerator } from '../botTypes';
import ReplyBot from '../replyBot';

// Custom response generator for variable-length "sheesh"
class RandomSheeshResponse implements ResponseGenerator {
	generateRandomEs(): string {
		const numberOfEs = Math.floor(Math.random() * 10);
		return 'e'.repeat(numberOfEs) + 'e' + 'e';
	}

	async generateResponse(): Promise<string> {
		return 'Sh' + this.generateRandomEs() + 'sh!';
	}
}

// Logger response that logs and returns a fixed response
class LoggingSheeshResponse implements ResponseGenerator {
	async generateResponse(message: Message): Promise<string> {
		Logger.debug(`😤 User ${message.author.username} said sheesh in: "${message.content}"`);
		return 'SHEEEEEEEESH 😤';
	}
}

export default function createSheeshBot(webhookService: WebhookService): ReplyBot {
	const identity: BotIdentity = {
		name: 'Sheesh Bot',
		avatarUrl: 'https://i.imgflip.com/5fc2iz.png?a471000'
	};
	const trigger = new CompositeTrigger([
		new PatternTrigger(/\bshee+sh\b/i),
		new PatternTrigger(/\bsheesh\b/i)
	]);
	const response = new CompositeSheeshResponse(
		new RandomSheeshResponse(),
		new LoggingSheeshResponse()
	);

	return new ReplyBot(identity, trigger, response, webhookService);
}

// Composite response generator that tries both responses
class CompositeSheeshResponse implements ResponseGenerator {
	constructor(
		private variableResponse: ResponseGenerator,
		private exactResponse: ResponseGenerator
	) { }

	async generateResponse(message: Message): Promise<string> {
		// If it's an exact "sheesh", use that response
		if (message.content.match(/\bsheesh\b/i)) {
			return this.exactResponse.generateResponse(message);
		}
		// Otherwise use the variable-length response
		return this.variableResponse.generateResponse(message);
	}
}
