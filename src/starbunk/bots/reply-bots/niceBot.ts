import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import ReplyBot from '../replyBot';
import { PatternCondition } from '../triggers/conditions/patternCondition';
import { Patterns } from '../triggers/conditions/patterns';

export default function createNiceBot(
	/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
	_webhookSvc: WebhookService = webhookService
): ReplyBot {
	// Always use the imported singleton webhookService, ignoring any webhookService in config
	// This ensures we're using the properly initialized webhookService with the writeMessage method
	const avatarUrl = 'https://cdn.pixabay.com/photo/2012/04/24/17/36/nice-40363_1280.png';
	return new BotBuilder('NiceBot', webhookService)
		.withAvatar(avatarUrl)
		.withCustomCondition(
			'Nice.',
			avatarUrl,
			new PatternCondition(Patterns.SPECIAL_NICE_NUMBER)
		)
		.build();
}
