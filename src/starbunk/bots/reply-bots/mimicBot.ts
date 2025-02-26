import { Message } from 'discord.js';
import userID from '../../../discord/userID';
import { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import { BotIdentity } from '../botTypes';
import ReplyBot from '../replyBot';

/**
 * MimicBot - A dynamic identity bot that mimics users
 *
 * This demonstrates creating a more complex bot with the builder pattern.
 * It has multiple triggers and a dynamic identity.
 */
export default function createMimicBot(webhookService: WebhookService): ReplyBot {
	// Define possible responses
	const responses = [
		"I'm copying you!",
		"Look at me, I'm just like you!",
		"Imitation is the sincerest form of flattery.",
		"Mirror mirror on the wall...",
		"Monkey see, monkey do!",
		"*mimics your pose*"
	];

	// Create a function to update the identity based on the message sender
	const identityUpdater = async (message: Message): Promise<BotIdentity> => {
		return {
			name: message.author.username,
			avatarUrl: message.author.displayAvatarURL()
		};
	};

	// Create and return the bot using the builder pattern
	return new BotBuilder('MimicBot', webhookService)
		// Add triggers - responds to "mimic" or randomly to specific users
		.withPatternTrigger(/\bmimic\b/i)
		.withUserRandomTrigger(userID.Venn, 5) // 5% chance to trigger for Venn

		// Configure the dynamic identity
		.withDynamicIdentity('https://i.imgur.com/default.png', identityUpdater)

		// Set the responses
		.respondsWithRandom(responses)

		// Build the final bot
		.build();
}
