import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import ReplyBot from '../replyBot';
import { OneCondition } from '../triggers/conditions/oneCondition';
import { PatternCondition } from '../triggers/conditions/patternCondition';
import { Patterns } from '../triggers/conditions/patterns';
import { RandomChanceCondition } from '../triggers/conditions/randomChanceCondition';

/**
 * VennBot - A bot that responds to mentions of Venn or randomly to Venn's messages
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
	// Option 1: Using pattern condition and random chance separately
	return new BotBuilder('VennBot', webhookServiceParam)
		.withAvatar('https://cdn.discordapp.com/attachments/854790294253117531/902975839420497940/venn.png')
		.withCustomTrigger(new OneCondition(
			new PatternCondition(Patterns.VENN_MENTION),
			new RandomChanceCondition(5)
		))
		.respondsWithRandom(responses)
		.build();
}
