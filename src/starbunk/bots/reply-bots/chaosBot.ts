import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import { PatternCondition, Patterns } from '../conditions';
import ReplyBot from '../replyBot';

/**
 * ChaosBot - A simple bot that responds to "chaos" with a fixed message
 */
export default function createChaosBot(webhookServiceParam: WebhookService = webhookService): ReplyBot {
	const chaosCondition = new PatternCondition(Patterns.CHAOS);

	return new BotBuilder('ChaosBot', webhookServiceParam)
		.withAvatar('https://preview.redd.it/md0lzbvuc3571.png?width=1920&format=png&auto=webp&s=ff403a8d4b514af8d99792a275d2c066b8d1a4de')
		.withCustomTrigger(chaosCondition)
		.respondsWithStatic("All I know is...I'm here to kill Chaos")
		.build();
}
