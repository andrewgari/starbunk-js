import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import ReplyBot from '../replyBot';
import { Patterns } from '../triggers/conditions/patterns';
export default function createNiceBot(
	// @ts-ignore - parameter kept for test compatibility but not used
	webhookServiceParam: WebhookService = webhookService
): ReplyBot {

	// Always use the imported singleton webhookService, ignoring any webhookService in config
	// This ensures we're using the properly initialized webhookService with the writeMessage method
	return new BotBuilder('BunkBot', webhookService)
		.withAvatar('https://pbs.twimg.com/profile_images/421461637325787136/0rxpHzVx.jpeg')
		.withPatternTrigger(Patterns.SPECIAL_NICE_NUMBER)
		.respondsWithStatic('Nice.')
		.build();
}
