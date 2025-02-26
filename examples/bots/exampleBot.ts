import { BotBuilder } from '../../src/starbunk/bots/botBuilder';
import ReplyBot from '../../src/starbunk/bots/replyBot';
import webhookService from '../../src/webhooks/webhookService';

/**
 * ExampleBot - A simple bot that responds to "example" with a random message
 *
 * This bot demonstrates the simplified builder pattern for creating bots.
 * Compare this implementation to other bots to see how much simpler it is.
 *
 * NOTE: This is an example bot and is not used in production.
 */
export default function createExampleBot(): ReplyBot {
	// Define possible responses
	const responses = [
		"I'm an example bot!",
		"This is how easy it is to create a bot now!",
		"Builders make everything simpler!",
		"No more boilerplate code!",
		"Did someone say 'example'?"
	];

	// Create and return the bot using the builder pattern
	return new BotBuilder('ExampleBot', webhookService)
		.withAvatar('https://i.imgur.com/example.png')
		.withPatternTrigger(/\bexample\b/i)
		.respondsWithRandom(responses)
		.build();
}
