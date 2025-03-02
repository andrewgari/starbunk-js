import webhookService, { WebhookService } from '@/webhooks/webhookService';
import { BotBuilder } from '../../botBuilder';
import ReplyBot from '../../replyBot';
import { BOT_NAME, GUY_BOT_AVATAR_URL } from './guyBotModel';

// Import the extracted components
import { GuyBotCondition } from './conditions/guyBotCondition';
import { updateGuyBotIdentity } from './identity/guyBotIdentityUpdater';
import { RandomGuyResponseGenerator } from './responses/randomGuyResponseGenerator';

/**
 * GuyBot - A bot that responds to messages containing "guy" with random Guy quotes,
 * has a 5% random chance of responding to any message, or responds to messages from Guy
 *
 * @param webhookSvc - The webhook service to use for sending messages
 * @returns A configured ReplyBot instance
 */
export default function createGuyBot(
	webhookSvc: WebhookService = webhookService
): ReplyBot {
	// Create the condition and response generator
	const guyBotCondition = new GuyBotCondition();
	const randomGuyResponseGenerator = new RandomGuyResponseGenerator();

	// Build and return the bot
	return new BotBuilder(BOT_NAME, webhookSvc)
		.withAvatar(GUY_BOT_AVATAR_URL)
		.withDynamicIdentity(GUY_BOT_AVATAR_URL, updateGuyBotIdentity)
		.withConditionResponse(
			randomGuyResponseGenerator,
			GUY_BOT_AVATAR_URL,
			guyBotCondition
		)
		.build();
}
