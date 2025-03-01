import webhookService, { WebhookService } from '@/webhooks/webhookService';
import { BotBuilder } from '../../botBuilder';
import ReplyBot from '../../replyBot';
import { PatternCondition } from '../../triggers/conditions/patternCondition';
import { Patterns } from '../../triggers/conditions/patterns';
import { CHECK_BOT_AVATAR_URL, CHECK_RESPONSE, CZECH_RESPONSE } from './checkBotModel';

export default function createCheckBot(
	webhookSvc: WebhookService = webhookService
): ReplyBot {
	// Always use the imported singleton webhookService, ignoring any webhookService in config
	// This ensures we're using the properly initialized webhookService with the writeMessage method
	return new BotBuilder('CheckBot', webhookSvc)
		.withAvatar(CHECK_BOT_AVATAR_URL)
		.withCustomCondition(
			CHECK_RESPONSE,
			new PatternCondition(Patterns.WORD_CZECH)
		)
		.withCustomCondition(
			CZECH_RESPONSE,
			new PatternCondition(Patterns.WORD_CHECK)
		)
		.build();
}
