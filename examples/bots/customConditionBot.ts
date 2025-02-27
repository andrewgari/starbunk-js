import { Message } from 'discord.js';
import { BotBuilder } from '../../src/starbunk/bots/botBuilder';
import { Condition, TimeDelayCondition } from '../../src/starbunk/bots/conditions';
import ReplyBot from '../../src/starbunk/bots/replyBot';
import { isVenn } from '../../src/starbunk/bots/triggers/userConditions';
import webhookService from '../../src/webhooks/webhookService';

/**
 * Custom condition that checks if a user is Venn
 */
class VennUserCondition extends Condition {
	async shouldTrigger(message: Message): Promise<boolean> {
		return isVenn(message);
	}
}

/**
 * Custom condition that checks if a message contains a specific word
 */
class WordCondition extends Condition {
	constructor(private word: string) {
		super();
	}

	async shouldTrigger(message: Message): Promise<boolean> {
		return message.content.toLowerCase().includes(this.word.toLowerCase());
	}
}

/**
 * CustomConditionBot - A bot that demonstrates the withCustomCondition method
 *
 * This bot shows how to use the withCustomCondition method to create
 * a bot with multiple condition-response pairs in a clean, declarative way.
 * Lower items in the list take precedence.
 *
 * NOTE: This is an example bot and is not used in production.
 */
export default function createCustomConditionBot(): ReplyBot {
	// Create the bot builder
	const builder = new BotBuilder('CustomConditionBot', webhookService)
		.withAvatar('https://i.imgur.com/example.png');

	// Create shared conditions
	const withinOneMinute = new TimeDelayCondition(60000, true); // 1 minute
	const cooldownFiveMinutes = new TimeDelayCondition(300000, false); // 5 minutes

	// Add conditions in order of increasing precedence (lower items take precedence)

	// Basic greeting
	builder.withCustomCondition(
		"Hello there! I'm a custom condition bot!",
		new WordCondition("hello")
	);

	// Response for "custom"
	builder.withCustomCondition(
		"You mentioned custom! That's what I'm all about!",
		new WordCondition("custom")
	);

	// Special response for Venn
	builder.withCustomCondition(
		"Oh, it's you, Venn. What do you want now?",
		new VennUserCondition(),
		new WordCondition("custom")
	);

	// Response with time-based condition
	builder.withCustomCondition(
		"You just talked to me! Give me a break!",
		new WordCondition("custom"),
		withinOneMinute
	);

	// Special response that only triggers after a cooldown
	builder.withCustomCondition(
		"I haven't seen you in a while! Welcome back!",
		new WordCondition("custom"),
		cooldownFiveMinutes
	);

	// Add a trigger to activate the bot
	builder.withPatternTrigger(/\b(custom|hello)\b/i);

	// Build and return the bot
	return builder.build();
}
