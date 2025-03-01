import webhookService, { WebhookService } from '@/webhooks/webhookService';
import { BotBuilder } from '../../botBuilder';
import ReplyBot from '../../replyBot';
import { AVATAR_URL, BOT_GREETING, BOT_NAME, RESPONSE_CHANCE } from './botBotModel';
import { RandomChanceCondition } from '../../triggers/conditions/randomChanceCondition';
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
	return new BotBuilder(BOT_NAME, webhookSvc)
		.withAvatar(AVATAR_URL)
		.withCustomCondition(
			BOT_GREETING,
			AVATAR_URL,
			new RandomChanceCondition(RESPONSE_CHANCE)
		)
		.allowBotMessages(true)
		.build();
}
