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
	// @ts-ignore - parameter kept for test compatibility but not used
	webhookServiceParam: WebhookService = webhookService
): ReplyBot {
	// Always use the imported singleton webhookService, ignoring any webhookService in config
	// This ensures we're using the properly initialized webhookService with the writeMessage method
	return new BotBuilder('BotBot', webhookService)
		.withAvatar('https://preview.redd.it/md0lzbvuc3571.png?width=1920&format=png&auto=webp&s=ff403a8d4b514af8d99792a275d2c066b8d1a4de')
		.withCustomTrigger(new RandomChanceCondition(5))
		.respondsWithStatic("Why hello there, fellow bot 🤖")
		.allowBotMessages(true)
		.build();
}
