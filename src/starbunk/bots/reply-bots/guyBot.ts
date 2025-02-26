import { Message } from 'discord.js';
import userID from '../../../discord/userID';
import { WebhookService } from '../../../webhooks/webhookService';
import { DynamicIdentity, DynamicResponse } from '../botFactory';
import { CompositeTrigger, PatternTrigger, RandomResponse, UserRandomTrigger } from '../botTypes';
import ReplyBot from '../replyBot';

const responses = [
	'What!? What did you say?',
	'Geeeeeet ready for Shriek Week!',
	'Try and keep up mate....',
	'But Who really died that day.\n...and who came back?',
	'Sheeeeeeeeeeeesh',
	"Rats! Rats! Weeeeeeeeee're the Rats!",
	'The One Piece is REEEEEEEEEEEEEEEEEEAL',
	'Psh, I dunno about that, Chief...',
	'Come to me my noble EINHERJAHR',
	"If you can't beat em, EAT em!",
	'Have you ever been so sick you sluiced your pants?',
	"Welcome back to ... Melon be Smellin'",
	"Chaotic Evil: Don't Respond. :unamused:",
	':NODDERS: Big Boys... :NODDERS:',
	'Fun Fact: That was actually in XI as well.',
	'Bird Up!',
	'Schlorp',
	"I wouldn't dream of disturbing something so hideously erogenous",
	'Good Year, Good Year',
	'True Grit',
	'MisterMisterMisterMisterMisterMisterMisterMisterMisterMisterMisterBeeeeeeeeeeeeeeeeeeeeeeeeeeast',
	"It's a message you can say",
	'Blimbo',
];

class GuyBot extends ReplyBot {
	constructor(webhookService: WebhookService) {
		const identity = new DynamicIdentity({
			defaultName: 'GuyBot',
			defaultAvatarUrl: '',
			async updateIdentity(message: Message) {
				const guy = await message.guild?.members.fetch(userID.Guy);
				return {
					name: guy?.nickname ?? guy?.displayName ?? 'GuyBot',
					avatarUrl: guy?.avatarURL() ?? guy?.displayAvatarURL() ?? ''
				};
			}
		});

		const trigger = new CompositeTrigger([
			new PatternTrigger(/\bguy\b/i),
			new UserRandomTrigger(userID.Guy, 5)
		]);

		const responseGenerator = new DynamicResponse(
			identity,
			new RandomResponse(responses)
		);

		super(identity, trigger, responseGenerator, webhookService);
	}

	getBotName(): string {
		return 'GuyBot';
	}
}

// Export the GuyBot class
export default GuyBot;
