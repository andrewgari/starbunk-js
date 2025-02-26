import { Message } from 'discord.js';
import webhookService from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import ReplyBot from '../replyBot';

/**
 * MimicBot - A bot that mimics the user who triggered it
 *
 * This bot demonstrates dynamic identity by changing its avatar and name
 * to match the user who triggered it with the word "mimic".
 *
 * NOTE: This is an example bot and is not used in production.
 */
export default function createMimicBot(): ReplyBot {
	// Create and return the bot using the builder pattern
	return new BotBuilder('MimicBot', webhookService)
		.withAvatar('https://i.imgur.com/default.png')
		.withPatternTrigger(/\bmimic\b/i)
		.withDynamicIdentity('https://i.imgur.com/default.png', async (message: Message) => {
			// Get the user who triggered the bot
			const user = message.author;

			// Return the user's avatar and name
			return {
				name: user.username,
				avatarUrl: user.displayAvatarURL()
			};
		})
		.respondsWithRandom([
			"I'm mimicking you!",
			"Look at me, I'm you now!",
			"Imitation is the sincerest form of flattery.",
			"Do I look like you?",
			"Mirror mirror on the wall..."
		])
		.build();
}
