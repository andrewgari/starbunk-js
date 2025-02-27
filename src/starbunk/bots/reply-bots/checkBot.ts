import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import ReplyBot from '../replyBot';
import { PatternCondition } from '../triggers/conditions/patternCondition';
import { Patterns } from '../triggers/conditions/patterns';

export default function createCheckBot(webhookServiceParam: WebhookService = webhookService): ReplyBot {
	return new BotBuilder('CheckBot', webhookServiceParam)
		.withAvatar('https://m.media-amazon.com/images/I/21Unzn9U8sL._AC_.jpg')
		.withCustomCondition(
			"I believe you mean 'check' :wink:",
			new PatternCondition(Patterns.CZECH)
		)
		.withCustomCondition(
			"I believe you mean 'czech' :wink:",
			new PatternCondition(Patterns.CHECK)
		)
		.build();
}
