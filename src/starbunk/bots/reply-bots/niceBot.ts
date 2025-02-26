import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import ReplyBot from '../replyBot';

export default function createNiceBot(webhookServiceParam: WebhookService = webhookService): ReplyBot {
	return new BotBuilder('BunkBot', webhookServiceParam)
		.withAvatar('https://pbs.twimg.com/profile_images/421461637325787136/0rxpHzVx.jpeg')
		.withPatternTrigger(/\b69|(sixty-?nine)\b/i)
		.respondsWithStatic('Nice.')
		.build();
}
