import { Message } from 'discord.js';
import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import { ResponseGenerator } from '../botTypes';
import ReplyBot from '../replyBot';
import { PatternCondition } from '../triggers/conditions/patternCondition';
import { Patterns } from '../triggers/conditions/patterns';

// Custom response generator for Ezio
class EzioResponseGenerator implements ResponseGenerator {
	async generateResponse(message: Message): Promise<string> {
		return `Remember ${message.author.displayName}, Nothing is true; Everything is permitted.`;
	}
}

export default function createEzioBot(webhookServiceParam: WebhookService = webhookService): ReplyBot {
	const responseGenerator = new EzioResponseGenerator();

	return new BotBuilder('Ezio Auditore Da Firenze', webhookServiceParam)
		.withAvatar('https://www.creativeuncut.com/gallery-12/art/ac2-ezio5.jpg')
		.withConditionResponse(
			responseGenerator,
			'https://www.creativeuncut.com/gallery-12/art/ac2-ezio5.jpg',
			new PatternCondition(Patterns.WORD_ASSASSIN)
		)
		.build();
}
