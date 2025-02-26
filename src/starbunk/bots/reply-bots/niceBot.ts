import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import { PatternCondition, Patterns } from '../conditions';
import ReplyBot from '../replyBot';

export default function createNiceBot(webhookServiceParam: WebhookService = webhookService): ReplyBot {
	const niceNumberCondition = new PatternCondition(Patterns.NICE_NUMBER);

	return new BotBuilder('BunkBot', webhookServiceParam)
		.withAvatar('https://pbs.twimg.com/profile_images/421461637325787136/0rxpHzVx.jpeg')
		.withCustomTrigger(niceNumberCondition)
		.respondsWithStatic('Nice.')
		.build();
}
