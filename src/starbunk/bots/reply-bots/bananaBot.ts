import { Message } from 'discord.js';
import userID from '../../../discord/userID';
import random from '../../../utils/random';
import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import { BotIdentity, TriggerCondition } from '../botTypes';
import { getUserIdentity } from '../identity/userIdentity';
import ReplyBot from '../replyBot';
import { OneCondition } from '../triggers/conditions/oneCondition';
import { PatternCondition } from '../triggers/conditions/patternCondition';
import { Patterns } from '../triggers/conditions/patterns';
// Define the responses as a constant outside the class
export const BANANA_RESPONSES = [
	"Always bring a :banana: to a party, banana's are good!",
	"Don't drop the :banana:, they're a good source of potassium!",
	"If you gave a monkey control over it's environment, it would fill the world with :banana:s...",
	'Banana. :banana:',
	"Don't judge a :banana: by it's skin.",
	'Life is full of :banana: skins.',
	'OOOOOOOOOOOOOOOOOOOOOH BA NA NA :banana:',
	':banana: Slamma!',
	'A :banana: per day keeps the Macaroni away...',
	"const bestFruit = ('b' + 'a' + + 'a').toLowerCase(); :banana:",
	"Did you know that the :banana:s we have today aren't even the same species of :banana:s we had 50 years ago. The fruit has gone extinct over time and it's actually a giant eugenics experimet to produce new species of :banana:...",
	"Monkeys always ask ''Wher :banana:', but none of them ask 'How :banana:?'",
	':banana: https://www.tiktok.com/@tracey_dintino_charles/video/7197753358143278378?_r=1&_t=8bFpt5cfIbG',
];

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
	const vennRandomTrigger = new VennRandomTrigger(5);

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
