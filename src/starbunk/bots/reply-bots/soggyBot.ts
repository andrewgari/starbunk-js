import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import { WetBreadPatternCondition } from '../conditions';
import ReplyBot from '../replyBot';

/**
 * SoggyBot - A bot that responds to wet bread mentions from users with the WetBread role
 */
export default function createSoggyBot(webhookServiceParam: WebhookService = webhookService): ReplyBot {
	const wetBreadCondition = new WetBreadPatternCondition();

	return new BotBuilder('SoggyBot', webhookServiceParam)
		.withAvatar('https://imgur.com/OCB6i4x.jpg')
		.withCustomTrigger(wetBreadCondition)
		.respondsWithStatic('Sounds like somebody enjoys wet bread')
		.build();
}
