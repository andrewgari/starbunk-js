import webhookService, { WebhookService } from '@/webhooks/webhookService';
import { BotBuilder } from '../../botBuilder';
import ReplyBot from '../../replyBot';
import { AVATAR_URL, BOT_NAME, CHAOS_RESPONSE } from './chaosBotModel';
import { PatternCondition } from '../../triggers/conditions/patternCondition';
import { Patterns } from '../../triggers/conditions/patterns';

/**
 * ChaosBot - A simple bot that responds to "chaos" with a fixed message
 */
export default function createChaosBot(
	webhookSvc: WebhookService = webhookService
): ReplyBot {
	// Always use the imported singleton webhookService, ignoring any webhookService in config
	// This ensures we're using the properly initialized webhookService with the writeMessage method
	return new BotBuilder(BOT_NAME, webhookSvc)
		.withAvatar(AVATAR_URL)
		.withCustomCondition(
			CHAOS_RESPONSE,
			AVATAR_URL,
			new PatternCondition(Patterns.WORD_CHAOS)
		)
		.build();
}
