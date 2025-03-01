import userID from '@/discord/userID';
import webhookService, { WebhookService } from '@/webhooks/webhookService';
import { Message } from 'discord.js';
import { BotBuilder } from '../../botBuilder';
import { BotIdentity } from '../../botTypes';
import { getUserIdentity } from '../../identity/userIdentity';
import ReplyBot from '../../replyBot';
import { AllConditions } from '../../triggers/conditions/allConditions';
import { OneCondition } from '../../triggers/conditions/oneCondition';
import { PatternCondition } from '../../triggers/conditions/patternCondition';
import { Patterns } from '../../triggers/conditions/patterns';
import { RandomChanceCondition } from '../../triggers/conditions/randomChanceCondition';
import { getGuyCondition } from '../../triggers/userConditions';
import { GUY_BOT_AVATAR_URL, RANDOM_RESPONSE_CHANCE_PERCENT, RESPONSES } from './guyBotModel';

/**
 * GuyBot - A bot that responds to messages containing "guy" with random Guy quotes,
 * has a 5% random chance of responding to any message, or responds to messages from Guy
 */
export default function createGuyBot(
	webhookSvc: WebhookService = webhookService
): ReplyBot {
	// Get the condition for checking if the message is from Guy
	const guyUserCondition = getGuyCondition();

	// Identity updater function that uses the new utility function
	const updateIdentity = async (message: Message): Promise<BotIdentity> => {
		// If the message is from Guy, use Guy's identity
		if (message.author.id === userID.Guy) {
			return await getUserIdentity(message);
		}

		// Otherwise, use the default GuyBot identity
		return {
			name: 'GuyBot',
			avatarUrl: GUY_BOT_AVATAR_URL
		};
	};

	// Always use the imported singleton webhookService, ignoring any webhookService in config
	// This ensures we're using the properly initialized webhookService with the writeMessage method
	return new BotBuilder('GuyBot', webhookSvc)
		.withAvatar(GUY_BOT_AVATAR_URL)
		.withCustomTrigger(new OneCondition(
			new PatternCondition(Patterns.WORD_GUY),
			new AllConditions(
				new RandomChanceCondition(RANDOM_RESPONSE_CHANCE_PERCENT),
				guyUserCondition
			)
		))
		.withDynamicIdentity(GUY_BOT_AVATAR_URL, updateIdentity)
		.respondsWithRandom(RESPONSES)
		.build();
}
