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

export default function createEzioBot(
	/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
	_webhookSvc: WebhookService = webhookService
): ReplyBot {
	const responseGenerator = new EzioResponseGenerator();

	// Always use the imported singleton webhookService, ignoring any webhookService in config
	// This ensures we're using the properly initialized webhookService with the writeMessage method
	return new BotBuilder('Ezio Auditore Da Firenze', webhookService)
		.withAvatar('https://www.creativeuncut.com/gallery-12/art/ac2-ezio5.jpg')
		.withConditionResponse(
			responseGenerator,
			'https://www.creativeuncut.com/gallery-12/art/ac2-ezio5.jpg',
			new PatternCondition(Patterns.WORD_ASSASSIN)
		)
		.build();
}
