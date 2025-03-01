import webhookService, { WebhookService } from '@/webhooks/webhookService';
import { BotBuilder } from '../../botBuilder';
import ReplyBot from '../../replyBot';
import { PatternCondition } from '../../triggers/conditions/patternCondition';
import { Patterns } from '../../triggers/conditions/patterns';
import { HOLD_BOT_AVATAR_URL, HOLD_BOT_RESPONSE } from './holdBotModel';

export default function createHoldBot(
	webhookSvc: WebhookService = webhookService
): ReplyBot {
	// Use the webhook service passed as parameter instead of always using the imported singleton
	return new BotBuilder('HoldBot', webhookSvc)
		.withAvatar(HOLD_BOT_AVATAR_URL)
		.withCustomCondition(
			HOLD_BOT_RESPONSE,
			HOLD_BOT_AVATAR_URL,
			new PatternCondition(Patterns.WORD_HOLD)
		)
		.build();
}
