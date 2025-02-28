import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import ReplyBot from '../replyBot';
import { PatternCondition } from '../triggers/conditions/patternCondition';
import { Patterns } from '../triggers/conditions/patterns';
/**
 * GundamBot - A bot that corrects people about the name of Gundam
 */

export default function createGundamBot(
	/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
	_webhookSvc: WebhookService = webhookService
): ReplyBot {
	// Always use the imported singleton webhookService, ignoring any webhookService in config
	// This ensures we're using the properly initialized webhookService with the writeMessage method
	const avatarUrl = 'https://i.imgur.com/WuBBl0A.png';
	return new BotBuilder('GundamBot', webhookService)
		.withAvatar(avatarUrl)
		.withCustomCondition(
			"That's the giant unicorn robot gandam, there i said it",
			avatarUrl,
			new PatternCondition(Patterns.WORD_GUNDAM)
		)
		.build();
}
