import webhookService, { WebhookService } from '@/webhooks/webhookService';
import { BotBuilder } from '../../botBuilder';
import ReplyBot from '../../replyBot';
import { BOT_NAME, NICE_BOT_AVATAR_URL } from './niceBotModel';

// Import the extracted components
import { SixtyNineCondition } from './conditions/sixtyNineCondition';
import { NiceResponseGenerator } from './responses/niceResponseGenerator';

/**
 * Creates a NiceBot instance that responds with "Nice." to messages containing "69"
 *
 * @param webhookSvc - The webhook service to use for sending messages
 * @returns A configured ReplyBot instance
 */
export default function createNiceBot(
	webhookSvc: WebhookService = webhookService
): ReplyBot {
	// Create the condition and response generator
	const sixtyNineCondition = new SixtyNineCondition();
	const niceResponseGenerator = new NiceResponseGenerator();

	// Build and return the bot
	return new BotBuilder(BOT_NAME, webhookSvc)
		.withAvatar(NICE_BOT_AVATAR_URL)
		.withConditionResponse(
			niceResponseGenerator,
			NICE_BOT_AVATAR_URL,
			sixtyNineCondition
		)
		.build();
}
