import webhookService from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import ReplyBot from '../replyBot';

/**
 * ExampleBot - A simple bot that responds to "example" with a random message
 *
 * This bot demonstrates the simplified builder pattern for creating bots.
 * Compare this implementation to other bots to see how much simpler it is.
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
