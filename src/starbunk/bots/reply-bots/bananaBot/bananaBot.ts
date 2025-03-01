import userID from '@/discord/userID';
import random from '@/utils/random';
import webhookService, { WebhookService } from '@/webhooks/webhookService';
import { Message } from 'discord.js';
import { BotBuilder } from '../../botBuilder';
import { BotIdentity, TriggerCondition } from '../../botTypes';
import { getUserIdentity } from '../../identity/userIdentity';
import ReplyBot from '../../replyBot';
import { OneCondition } from '../../triggers/conditions/oneCondition';
import { PatternCondition } from '../../triggers/conditions/patternCondition';
import { Patterns } from '../../triggers/conditions/patterns';
import { BANANA_CONFIG, BANANA_RESPONSES } from './bananaBotModel';

// Custom trigger for Venn with random chance
class VennRandomTrigger implements TriggerCondition {
	constructor(private chance: number) { }

	async shouldTrigger(message: Message): Promise<boolean> {
		return message.author.id === userID.Venn && random.percentChance(this.chance);
	}
}

/**
 * BananaBot - A bot that responds to messages containing "banana" or randomly to Venn
 * This bot dynamically updates its identity to mimic the user it's responding to
 */
export default function createBananaBot(
	webhookSvc: WebhookService = webhookService
): ReplyBot {
	// Identity updater function that uses the new utility function
	const updateIdentity = async (message: Message): Promise<BotIdentity> => {
		return await getUserIdentity(message);
	};

	const bananaCondition = new PatternCondition(Patterns.WORD_BANANA);
	const vennRandomTrigger = new VennRandomTrigger(BANANA_CONFIG.VENN_RANDOM_CHANCE);

	const oneCondition = new OneCondition(bananaCondition, vennRandomTrigger);

	// Create and return the bot using the builder pattern
	// Always use the imported singleton webhookService, ignoring any webhookService in config
	// This ensures we're using the properly initialized webhookService with the writeMessage method
	return new BotBuilder('BananaBot', webhookSvc)
		// Add custom triggers
		.withCustomTrigger(oneCondition)
		// Set up dynamic identity that updates based on the message sender
		.withDynamicIdentity('', updateIdentity)
		// Set responses
		.respondsWithRandom(BANANA_RESPONSES)
		.build();
}
