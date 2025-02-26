import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import { PatternCondition, Patterns } from '../conditions';
import ReplyBot from '../replyBot';

export default function createHoldBot(webhookServiceParam: WebhookService = webhookService): ReplyBot {
	const holdCondition = new PatternCondition(Patterns.HOLD);

	return new BotBuilder('HoldBot', webhookServiceParam)
		.withAvatar('https://i.imgur.com/YPFGEzM.png')
		.withCustomTrigger(holdCondition)
		.respondsWithStatic('Hold.')
		.build();
}
