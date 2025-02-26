import { Message } from 'discord.js';
import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import { ResponseGenerator } from '../botTypes';
import { PatternCondition, Patterns } from '../conditions';
import ReplyBot from '../replyBot';

// Custom response generator for Ezio
class EzioResponseGenerator implements ResponseGenerator {
	async generateResponse(message: Message): Promise<string> {
		return `Remember ${message.author.displayName}, Nothing is true; Everything is permitted.`;
	}
}

export default function createEzioBot(webhookServiceParam: WebhookService = webhookService): ReplyBot {
	const ezioCondition = new PatternCondition(Patterns.EZIO);

	return new BotBuilder('Ezio Auditore Da Firenze', webhookServiceParam)
		.withAvatar('https://www.creativeuncut.com/gallery-12/art/ac2-ezio5.jpg')
		.withCustomTrigger(ezioCondition)
		.respondsWithCustom(new EzioResponseGenerator())
		.build();
}
