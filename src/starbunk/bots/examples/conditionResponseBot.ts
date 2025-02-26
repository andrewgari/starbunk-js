import { Message } from 'discord.js';
import webhookService from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import { StaticResponse } from '../botTypes';
import ReplyBot from '../replyBot';
import { isVenn } from '../triggers/userConditions';

/**
 * ConditionResponseBot - A bot that demonstrates the condition-response pattern
 *
 * This bot shows how to use the withConditionResponse method to create
 * a bot with multiple condition-response pairs in a clean, declarative way.
 *
 * NOTE: This is an example bot and is not used in production.
 */
export default function createConditionResponseBot(): ReplyBot {
	// Create the bot builder
	const builder = new BotBuilder('ConditionBot', webhookService)
		.withAvatar('https://i.imgur.com/example.png');

	// Track when the bot last responded
	let lastResponseTime = 0;

	// Add condition-response pairs in priority order

	// 1. Respond to "hello" with a greeting
	builder.withConditionResponse(
		new StaticResponse("Hello there! I'm a condition-response bot!"),
		(message: Message) => Promise.resolve(message.content.toLowerCase().includes('hello'))
	);

	// 2. Special response for Venn
	builder.withConditionResponse(
		new StaticResponse("Oh, it's you, Venn. What do you want now?"),
		(message: Message) => Promise.resolve(isVenn(message)),
		(message: Message) => Promise.resolve(message.content.toLowerCase().includes('condition'))
	);

	// 3. Response with time-based condition
	builder.withConditionResponse(
		new StaticResponse("You just talked to me! Give me a break!"),
		(message: Message) => {
			const currentTime = Date.now();
			const isWithinOneMinute = (currentTime - lastResponseTime) < 60000; // 1 minute

			// Update last response time if this condition matches
			if (isWithinOneMinute) {
				lastResponseTime = currentTime;
			}

			return Promise.resolve(isWithinOneMinute && message.content.toLowerCase().includes('condition'));
		}
	);

	// 4. Default response for "condition"
	builder.withConditionResponse(
		new StaticResponse("You mentioned conditions! That's what I'm all about!"),
		(message: Message) => {
			const currentTime = Date.now();
			const matches = message.content.toLowerCase().includes('condition');

			// Update last response time if this condition matches
			if (matches) {
				lastResponseTime = currentTime;
			}

			return Promise.resolve(matches);
		}
	);

	// Add a trigger to activate the bot
	builder.withPatternTrigger(/\b(condition|hello)\b/i);

	// Build and return the bot
	return builder.build();
}
