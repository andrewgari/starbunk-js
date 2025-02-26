import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import ReplyBot from '../replyBot';

/**
 * GundamBot - A bot that responds to mentions of Gundam, mecha, robot, etc.
 */
const responses = [
	'You\'re going down, Patlabor!',
	'Super Dimension Fortress. I feel small...',
	'Get in the robot!',
	'I\'ll destroy your Gundam!',
	'I\'ll destroy you WITH my Gundam!',
	'Let me show you the power of my Victory Gundam!',
	'Trunks! Get back in your Gundam!',
	'TRANS-AM!',
	'Colony drop inbound!',
	'This operation... you know what it means, don\'t you?',
	'Char Aznable is waiting for you!',
	'Launching the Keilas Guilie !!',
	'In a Zaku? You\'re piloting a Zaku in this day and age? Mmm, you\'ve got guts...',
	'Celestial Being, eliminating war, with war.',
	'I AM GUNDAM!',
	'I\'ll take this... G-ARMOR!',
	'I\'ll make it. I\'ll make the machines with all my heart.',
	'Titans! Let\'s go!',
	'Together, we\'ll make a world without conflict!',
	'Operation: Meteor has begun!'
];

export default function createGundamBot(webhookServiceParam: WebhookService = webhookService): ReplyBot {
	return new BotBuilder('GundamBot', webhookServiceParam)
		.withAvatar('https://cdn.discordapp.com/attachments/854790294253117531/902975839584849930/gundam.png')
		.withPatternTrigger(/\b(gundam|mecha|robot|pacific rim|jaeger)\b/i)
		.respondsWithRandom(responses)
		.build();
}
