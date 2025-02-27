import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import ReplyBot from '../replyBot';
import { AllConditions } from '../triggers/conditions/allConditions';
import { RandomChanceCondition } from '../triggers/conditions/randomChanceCondition';
import { getVennCondition } from '../triggers/userConditions';

/**
 * VennBot - A bot that responds to Venn's messages with a 5% chance
 */
const responses = [
	'Sorry, but that was über cringe...',
	'Geez, that was hella cringe...',
	'That was cringe to the max...',
	'What a cringe thing to say...',
	'Mondo cringe, man...',
	"Yo that was the cringiest thing I've ever heard...",
	'Your daily serving of cringe, milord...',
	'On a scale of one to cringe, that was pretty cringe...',
	'That was pretty cringe :airplane:',
	'Wow, like....cringe much?',
	'Excuse me, I seem to have dropped my cringe. Do you have it perchance?',
	'Like I always say, that was pretty cringe...',
	'C.R.I.N.G.E',
];

export default function createVennBot(webhookServiceParam: WebhookService = webhookService): ReplyBot {
	// Create conditions
	const vennCondition = getVennCondition();
	const randomChanceCondition = new RandomChanceCondition(5);

	// Combine conditions - only trigger for Venn's messages with a 5% chance
	const combinedCondition = new AllConditions(vennCondition, randomChanceCondition);

	return new BotBuilder('VennBot', webhookServiceParam)
		.withAvatar('https://cdn.discordapp.com/attachments/854790294253117531/902975839420497940/venn.png')
		.withCustomTrigger(combinedCondition)
		.respondsWithRandom(responses)
		.build();
}
