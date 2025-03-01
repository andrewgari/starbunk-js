import webhookService, { WebhookService } from '@/webhooks/webhookService';
import { BotBuilder } from '../../botBuilder';
import ReplyBot from '../../replyBot';
import { AVATAR_URL, BOT_NAME, GUNDAM_RESPONSE } from './gundamBotModel';
import { PatternCondition } from '../../triggers/conditions/patternCondition';
import { Patterns } from '../../triggers/conditions/patterns';
/**
 * GundamBot - A bot that corrects people about the name of Gundam
 */

export default function createGundamBot(
	webhookSvc: WebhookService = webhookService
): ReplyBot {
	// Always use the imported singleton webhookService, ignoring any webhookService in config
	// This ensures we're using the properly initialized webhookService with the writeMessage method
	return new BotBuilder(BOT_NAME, webhookSvc)
		.withAvatar(AVATAR_URL)
		.withCustomCondition(
			GUNDAM_RESPONSE,
			AVATAR_URL,
			new PatternCondition(Patterns.WORD_GUNDAM)
		)
		.build();
}
