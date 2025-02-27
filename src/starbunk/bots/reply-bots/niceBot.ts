import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import ReplyBot from '../replyBot';
import { Patterns } from '../triggers/conditions/patterns';
export default function createNiceBot(webhookServiceParam: WebhookService = webhookService): ReplyBot {

	return new BotBuilder('BunkBot', webhookServiceParam)
		.withAvatar('https://pbs.twimg.com/profile_images/421461637325787136/0rxpHzVx.jpeg')
		.withPatternTrigger(Patterns.SPECIAL_NICE_NUMBER)
		.respondsWithStatic('Nice.')
		.build();
}
