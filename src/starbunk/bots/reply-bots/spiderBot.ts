import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import ReplyBot from '../replyBot';
import { AVATAR_URL, BOT_NAME, SPIDERMAN_CORRECTION } from '../responses/spiderBot.responses';
import { PatternCondition } from '../triggers/conditions/patternCondition';
import { Patterns } from '../triggers/conditions/patterns';

export default function createSpiderBot(
	webhookSvc: WebhookService = webhookService
): ReplyBot {
	// Use the webhook service passed as parameter
	return new BotBuilder(BOT_NAME, webhookSvc)
		.withAvatar(AVATAR_URL)
		.withCustomCondition(
			SPIDERMAN_CORRECTION,
			AVATAR_URL,
			new PatternCondition(Patterns.WORD_SPIDERMAN)
		)
		.build();
}
