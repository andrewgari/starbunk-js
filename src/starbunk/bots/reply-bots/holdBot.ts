import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import ReplyBot from '../replyBot';
import { PatternCondition } from '../triggers/conditions/patternCondition';
import { Patterns } from '../triggers/conditions/patterns';
export default function createHoldBot(
	/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
	_webhookSvc: WebhookService = webhookService
): ReplyBot {
	// Always use the imported singleton webhookService, ignoring any webhookService in config
	// This ensures we're using the properly initialized webhookService with the writeMessage method
	const avatarUrl = 'https://i.imgur.com/YPFGEzM.png';
	return new BotBuilder('HoldBot', webhookService)
		.withAvatar(avatarUrl)
		.withCustomCondition(
			'Hold.',
			avatarUrl,
			new PatternCondition(Patterns.WORD_HOLD)
		)
		.build();
}
