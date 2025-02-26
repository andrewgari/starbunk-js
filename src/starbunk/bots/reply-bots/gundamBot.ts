import { WebhookService } from '../../../webhooks/webhookService';
import { CompositeTrigger, PatternTrigger, RandomResponse } from '../botTypes';
import ReplyBot from '../replyBot';

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

class GundamBot extends ReplyBot {
	constructor(webhookService: WebhookService) {
		const trigger = new CompositeTrigger([
			new PatternTrigger(/\b(gundam|mecha|robot|pacific rim|jaeger)\b/i)
		]);

		const responseGenerator = new RandomResponse(responses);

		super(
			{
				name: 'GundamBot',
				avatarUrl: 'https://cdn.discordapp.com/attachments/854790294253117531/902975839584849930/gundam.png',
			},
			trigger,
			responseGenerator,
			webhookService
		);
	}

	getBotName(): string {
		return 'GundamBot';
	}
}

// Export the GundamBot class
export default GundamBot;
