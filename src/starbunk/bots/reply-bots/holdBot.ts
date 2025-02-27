import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import ReplyBot from '../replyBot';
import { Patterns } from '../triggers/conditions/patterns';
export default function createHoldBot(webhookServiceParam: WebhookService = webhookService): ReplyBot {
	return new BotBuilder('HoldBot', webhookServiceParam)
		.withAvatar('https://i.imgur.com/YPFGEzM.png')
		.withPatternTrigger(Patterns.HOLD)
		.respondsWithStatic('Hold.')
		.build();
}
