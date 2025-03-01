import webhookService, { WebhookService } from '@/webhooks/webhookService';
import { BotBuilder } from '../../botBuilder';
import ReplyBot from '../../replyBot';
import { AVATAR_URL, BOT_NAME } from './spiderBotModel';

// Import the extracted components
import { SpiderManCondition } from './conditions/spiderManCondition';
import { SpiderManCorrectionGenerator } from './responses/spiderManCorrectionGenerator';

/**
 * Creates a Spider-Bot instance that corrects people who write "spiderman" without a hyphen
 *
 * @param webhookSvc - The webhook service to use for sending messages
 * @returns A configured ReplyBot instance
 */
export default function createSpiderBot(
	webhookSvc: WebhookService = webhookService
): ReplyBot {
	// Create the condition and response generator
	const spiderManCondition = new SpiderManCondition();
	const correctionGenerator = new SpiderManCorrectionGenerator();

	// Build and return the bot
	return new BotBuilder(BOT_NAME, webhookSvc)
		.withAvatar(AVATAR_URL)
		.withConditionResponse(
			correctionGenerator,
			AVATAR_URL,
			spiderManCondition
		)
		.build();
}
