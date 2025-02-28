import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import ReplyBot from '../replyBot';
import { Patterns } from '../triggers/conditions/patterns';
export default function createHoldBot(
	// @ts-ignore - parameter kept for test compatibility but not used
	webhookServiceParam: WebhookService = webhookService
): ReplyBot {
	// Always use the imported singleton webhookService, ignoring any webhookService in config
	// This ensures we're using the properly initialized webhookService with the writeMessage method
	return new BotBuilder('HoldBot', webhookService)
		.withAvatar('https://i.imgur.com/YPFGEzM.png')
		.withPatternTrigger(Patterns.WORD_HOLD)
		.respondsWithStatic('Hold.')
		.build();
}
