import { Message } from 'discord.js';
import userID from '../../../discord/userID';
import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import { BotIdentity } from '../botTypes';
import { getUserIdentity } from '../identity/userIdentity';
import ReplyBot from '../replyBot';
import { AllConditions } from '../triggers/conditions/allConditions';
import { OneCondition } from '../triggers/conditions/oneCondition';
import { PatternCondition } from '../triggers/conditions/patternCondition';
import { Patterns } from '../triggers/conditions/patterns';
import { RandomChanceCondition } from '../triggers/conditions/randomChanceCondition';
import { getGuyCondition } from '../triggers/userConditions';

const responses = [
	'What!? What did you say?',
	'Geeeeeet ready for Shriek Week!',
	'Try and keep up mate....',
	'But Who really died that day.\n...and who came back?',
	'Sheeeeeeeeeeeesh',
	"Rats! Rats! Weeeeeeee're the Rats!",
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
			avatarUrl: 'https://i.pinimg.com/originals/dc/39/85/dc3985a3ac127397c53bf8c3a749b011.jpg'
		};
	};

	// Always use the imported singleton webhookService, ignoring any webhookService in config
	// This ensures we're using the properly initialized webhookService with the writeMessage method
	return new BotBuilder('GuyBot', webhookSvc)
		.withAvatar('https://i.pinimg.com/originals/dc/39/85/dc3985a3ac127397c53bf8c3a749b011.jpg')
		.withCustomTrigger(new OneCondition(
			new PatternCondition(Patterns.WORD_GUY),
			new AllConditions(
				new RandomChanceCondition(5),
				guyUserCondition
			)
		))
		.withDynamicIdentity('https://i.pinimg.com/originals/dc/39/85/dc3985a3ac127397c53bf8c3a749b011.jpg', updateIdentity)
		.respondsWithRandom(responses)
		.build();
}
