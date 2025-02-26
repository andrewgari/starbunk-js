import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import ReplyBot from '../replyBot';

export default function createHoldBot(webhookServiceParam: WebhookService = webhookService): ReplyBot {
	return new BotBuilder('HoldBot', webhookServiceParam)
		.withAvatar('https://i.imgur.com/YPFGEzM.png')
		.withPatternTrigger(/\bhold\b/i)
		.respondsWithStatic('Hold.')
		.build();
}
