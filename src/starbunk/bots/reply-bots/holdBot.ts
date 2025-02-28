import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import ReplyBot from '../replyBot';
import { PatternCondition } from '../triggers/conditions/patternCondition';
import { Patterns } from '../triggers/conditions/patterns';
export default function createHoldBot(
	webhookSvc: WebhookService = webhookService
): ReplyBot {
	// Use the webhook service passed as parameter instead of always using the imported singleton
	const avatarUrl = 'https://i.imgur.com/YPFGEzM.png';
	return new BotBuilder('HoldBot', webhookSvc)
		.withAvatar(avatarUrl)
		.withCustomCondition(
			'Hold.',
			avatarUrl,
			new PatternCondition(Patterns.WORD_HOLD)
		)
		.build();
}
