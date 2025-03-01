import { Message } from 'discord.js';
import userID from '../../../discord/userID';
import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import { BotIdentity } from '../botTypes';
import { getUserIdentity } from '../identity/userIdentity';
import ReplyBot from '../replyBot';
import { AVATAR_URL, BOT_NAME, CRINGE_RESPONSES, RESPONSE_CHANCE } from '../responses/vennBot.responses';
import { AllConditions } from '../triggers/conditions/allConditions';
import { RandomChanceCondition } from '../triggers/conditions/randomChanceCondition';
import { getVennCondition } from '../triggers/userConditions';

/**
 * VennBot - A bot that responds to Venn's messages with a 5% chance
 */
export default function createVennBot(
	webhookSvc: WebhookService = webhookService
): ReplyBot {
	// Create conditions
	const vennCondition = getVennCondition();
	const randomChanceCondition = new RandomChanceCondition(RESPONSE_CHANCE);

	// Combine conditions - only trigger for Venn's messages with a 5% chance
	const combinedCondition = new AllConditions(vennCondition, randomChanceCondition);

	// Identity updater function that uses the new utility function
	const updateIdentity = async (message: Message): Promise<BotIdentity> => {
		// If the message is from Venn, use Venn's identity
		if (message.author.id === userID.Venn) {
			return await getUserIdentity(message);
		}

		// Otherwise, use the default VennBot identity
		return {
			name: BOT_NAME,
			avatarUrl: AVATAR_URL
		};
	};

	// Always use the imported singleton webhookService, ignoring any webhookService in config
	// This ensures we're using the properly initialized webhookService with the writeMessage method
	return new BotBuilder(BOT_NAME, webhookSvc)
		.withAvatar(AVATAR_URL)
		.withCustomTrigger(combinedCondition)
		.withDynamicIdentity(AVATAR_URL, updateIdentity)
		.respondsWithRandom(CRINGE_RESPONSES)
		.build();
}
