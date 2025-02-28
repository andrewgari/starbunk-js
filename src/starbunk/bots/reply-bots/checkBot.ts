import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import ReplyBot from '../replyBot';
import { PatternCondition } from '../triggers/conditions/patternCondition';
import { Patterns } from '../triggers/conditions/patterns';

export default function createCheckBot(
	webhookSvc: WebhookService = webhookService
): ReplyBot {
	// Always use the imported singleton webhookService, ignoring any webhookService in config
	// This ensures we're using the properly initialized webhookService with the writeMessage method
	return new BotBuilder('CheckBot', webhookSvc)
		.withAvatar('https://m.media-amazon.com/images/I/21Unzn9U8sL._AC_.jpg')
		.withCustomCondition(
			"I believe you mean 'check' :wink:",
			new PatternCondition(Patterns.WORD_CZECH)
		)
		.withCustomCondition(
			"I believe you mean 'czech' :wink:",
			new PatternCondition(Patterns.WORD_CHECK)
		)
		.build();
}
