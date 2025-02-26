import userID from '../../../discord/userID';
import { WebhookService } from '../../../webhooks/webhookService';
import { CompositeTrigger, PatternTrigger, RandomResponse, UserRandomTrigger } from '../botTypes';
import ReplyBot from '../replyBot';

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

class VennBot extends ReplyBot {
	constructor(webhookService: WebhookService) {
		const trigger = new CompositeTrigger([
			new PatternTrigger(/\bvenn\b/i),
			new UserRandomTrigger(userID.Venn, 5),
		]);

		const responseGenerator = new RandomResponse(responses);

		super(
			{
				name: 'VennBot',
				avatarUrl: 'https://cdn.discordapp.com/attachments/854790294253117531/902975839420497940/venn.png',
			},
			trigger,
			responseGenerator,
			webhookService
		);
	}

	getBotName(): string {
		return 'VennBot';
	}
}

// Export the VennBot class
export default VennBot;
