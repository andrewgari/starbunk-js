import webhookService from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import ReplyBot from '../replyBot';

const responses = [
	'I\'m not your guy, friend!',
	'I\'m not your guy, buddy!',
	'I\'m not your guy, pal!',
	'I\'m not your guy, chum!',
	'I\'m not your guy, amigo!'
];

/**
 * GuyBot - A bot that responds to messages containing "guy" with "I'm not your guy, friend!" variations
 */
export default function createGuyBot(): ReplyBot {
	return new BotBuilder('GuyBot', webhookService)
		.withAvatar('https://i.pinimg.com/originals/dc/39/85/dc3985a3ac127397c53bf8c3a749b011.jpg')
		.withPatternTrigger(/\bguy\b/i)
		.respondsWithRandom(responses)
		.build();
}
