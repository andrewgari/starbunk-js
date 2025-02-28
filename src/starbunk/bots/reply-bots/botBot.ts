import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import ReplyBot from '../replyBot';
import { RandomChanceCondition } from '../triggers/conditions/randomChanceCondition';
/**
 * BotBot - A bot that occasionally responds to other bots
 *
 * This bot has a 5% chance to respond to messages from other bots
 * with a friendly greeting
 */
export default function createBotBot(
	webhookSvc: WebhookService = webhookService
): ReplyBot {
	// Always use the imported singleton webhookService, ignoring any webhookService in config
	// This ensures we're using the properly initialized webhookService with the writeMessage method
	return new BotBuilder('BotBot', webhookSvc)
		.withAvatar('https://cdn-icons-png.flaticon.com/512/4944/4944377.png')
		.withCustomCondition(
			"Why hello there, fellow bot 🤖",
			'https://cdn-icons-png.flaticon.com/512/4944/4944377.png',
			new RandomChanceCondition(5)
		)
		.allowBotMessages(true)
		.build();
}
