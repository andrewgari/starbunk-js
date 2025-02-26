import { Message } from 'discord.js';
import userID from '../../../discord/userID';
import webhookService from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import { BotIdentity } from '../botTypes';
import ReplyBot from '../replyBot';

/**
 * ComplexExampleBot - A more advanced example bot
 *
 * This bot demonstrates multiple triggers and conditional responses
 * based on message content and user identity.
 *
 * NOTE: This is an example bot and is not used in production.
 */
export default function createComplexExampleBot(): ReplyBot {
	// Define possible responses
	const responses = [
		"I'm a complex example bot!",
		"This demonstrates multiple triggers and dynamic responses!",
		"You can use this pattern for more advanced bots!",
		"Complex doesn't mean complicated with the builder pattern!",
		"Check out my source code to see how I work!"
	];

	// Create a function to update the identity based on the message sender
	const identityUpdater = async (message: Message): Promise<BotIdentity> => {
		// If the message contains "transform", mimic the user
		if (message.content.toLowerCase().includes('transform')) {
			return {
				name: message.author.username,
				avatarUrl: message.author.displayAvatarURL()
			};
		}

		// Otherwise use default identity
		return {
			name: 'ComplexBot',
			avatarUrl: 'https://i.imgur.com/complex.png'
		};
	};

	// Create and return the bot using the builder pattern
	return new BotBuilder('ComplexBot', webhookService)
		.withAvatar('https://i.imgur.com/complex.png')
		// Add multiple triggers
		.withPatternTrigger(/\bcomplex\b/i)
		.withUserRandomTrigger(userID.Venn, 10) // 10% chance to trigger for Venn

		// Configure the dynamic identity
		.withDynamicIdentity('https://i.imgur.com/complex.png', identityUpdater)

		// Set the responses
		.respondsWithRandom(responses)

		// Build the final bot
		.build();
}
