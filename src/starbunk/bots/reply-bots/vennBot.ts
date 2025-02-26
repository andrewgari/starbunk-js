import userID from '../../../discord/userID';
import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import ReplyBot from '../replyBot';

/**
 * VennBot - A bot that responds to mentions of Venn or randomly to Venn's messages
 */
const responses = [
	'Oh no guys, it\'s in the other DPS now',
	'Oh hey dude',
	'Oh wait, I think I got it to work',
	'Happy Birthday',
	'Oh this fight',
	'Oh this is the ez fight',
	'Chillinhour',
	'Taco Bell stream?',
	'Oh, let me look',
	'*Confused Venn Noises*',
	'Wow, he actually did it',
	'Actually, it\'s a great team comp',
	'We can do it man',
	'ez',
	'Not to be TOO political, but...',
];

export default function createVennBot(webhookServiceParam: WebhookService = webhookService): ReplyBot {
	return new BotBuilder('VennBot', webhookServiceParam)
		.withAvatar('https://cdn.discordapp.com/attachments/854790294253117531/902975839420497940/venn.png')
		.withPatternTrigger(/\bvenn\b/i)
		.withUserRandomTrigger(userID.Venn, 5)
		.respondsWithRandom(responses)
		.build();
}
