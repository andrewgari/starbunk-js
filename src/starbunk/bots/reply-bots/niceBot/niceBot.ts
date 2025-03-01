import webhookService, { WebhookService } from '@/webhooks/webhookService';
import { BotBuilder } from '../../botBuilder';
import ReplyBot from '../../replyBot';
import { PatternCondition } from '../../triggers/conditions/patternCondition';
import { Patterns } from '../../triggers/conditions/patterns';
import { NICE_BOT_AVATAR_URL, NICE_BOT_RESPONSE } from './niceBotModel';

export default function createNiceBot(
	webhookSvc: WebhookService = webhookService
): ReplyBot {
	// Always use the imported singleton webhookService, ignoring any webhookService in config
	// This ensures we're using the properly initialized webhookService with the writeMessage method
	return new BotBuilder('NiceBot', webhookSvc)
		.withAvatar(NICE_BOT_AVATAR_URL)
		.withCustomCondition(
			NICE_BOT_RESPONSE,
			NICE_BOT_AVATAR_URL,
			new PatternCondition(Patterns.SPECIAL_NICE_NUMBER)
		)
		.build();
}
