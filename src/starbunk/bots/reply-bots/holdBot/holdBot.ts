import webhookService, { WebhookService } from '@/webhooks/webhookService';
import { BotBuilder } from '../../botBuilder';
import ReplyBot from '../../replyBot';
import { BOT_NAME, HOLD_BOT_AVATAR_URL } from './holdBotModel';

// Import the extracted components
import { HoldCondition } from './conditions/holdCondition';
import { HoldResponseGenerator } from './responses/holdResponseGenerator';

/**
 * Creates a HoldBot instance that responds with "Hold." to messages containing "hold"
 *
 * @param webhookSvc - The webhook service to use for sending messages
 * @returns A configured ReplyBot instance
 */
export default function createHoldBot(
	webhookSvc: WebhookService = webhookService
): ReplyBot {
	// Create the condition and response generator
	const holdCondition = new HoldCondition();
	const holdResponseGenerator = new HoldResponseGenerator();

	// Build and return the bot
	return new BotBuilder(BOT_NAME, webhookSvc)
		.withAvatar(HOLD_BOT_AVATAR_URL)
		.withConditionResponse(
			holdResponseGenerator,
			HOLD_BOT_AVATAR_URL,
			holdCondition
		)
		.build();
}
