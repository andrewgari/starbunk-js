import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import ReplyBot from '../replyBot';
import { PatternCondition } from '../triggers/conditions/patternCondition';
import { Patterns } from '../triggers/conditions/patterns';

/**
 * ChaosBot - A simple bot that responds to "chaos" with a fixed message
 */
export default function createChaosBot(
	webhookSvc: WebhookService = webhookService
): ReplyBot {
	// Always use the imported singleton webhookService, ignoring any webhookService in config
	// This ensures we're using the properly initialized webhookService with the writeMessage method
	const avatarUrl = 'https://preview.redd.it/md0lzbvuc3571.png?width=1920&format=png&auto=webp&s=ff403a8d4b514af8d99792a275d2c066b8d1a4de';
	return new BotBuilder('ChaosBot', webhookSvc)
		.withAvatar(avatarUrl)
		.withCustomCondition(
			"All I know is...I'm here to kill Chaos",
			avatarUrl,
			new PatternCondition(Patterns.WORD_CHAOS)
		)
		.build();
}
