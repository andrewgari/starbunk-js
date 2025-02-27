# Example Bots

This directory contains example bots that demonstrate various patterns and techniques for creating bots in the Starbunk system. These examples are not part of the main bot pipeline but serve as documentation and reference implementations.

## Available Examples

### ExampleBot

A simple bot that demonstrates the basic builder pattern with random responses.

```typescript
import webhookService from '../src/webhooks/webhookService';
import { BotBuilder } from '../src/starbunk/bots/botBuilder';
import ReplyBot from '../src/starbunk/bots/replyBot';

export default function createExampleBot(): ReplyBot {
	// Define possible responses
	const responses = [
		"I'm an example bot!",
		'This is how easy it is to create a bot now!',
		'Builders make everything simpler!',
		'No more boilerplate code!',
		"Did someone say 'example'?",
	];

	// Create and return the bot using the builder pattern
	return new BotBuilder('ExampleBot', webhookService)
		.withAvatar('https://i.imgur.com/example.png')
		.withPatternTrigger(/\bexample\b/i)
		.respondsWithRandom(responses)
		.build();
}
```

### MimicBot

A bot that demonstrates dynamic identity by changing its avatar and name to match the user who triggered it.

```typescript
export default function createMimicBot(): ReplyBot {
	return new BotBuilder('MimicBot', webhookService)
		.withAvatar('https://i.imgur.com/default.png')
		.withPatternTrigger(/\bmimic\b/i)
		.withDynamicIdentity('https://i.imgur.com/default.png', async (message: Message) => {
			return {
				name: message.author.username,
				avatarUrl: message.author.displayAvatarURL(),
			};
		})
		.respondsWithRandom([
			"I'm mimicking you!",
			"Look at me, I'm you now!",
			'Imitation is the sincerest form of flattery.',
		])
		.build();
}
```

### ComplexExampleBot

A more advanced bot that demonstrates multiple triggers and conditional responses based on message content and user identity.

```typescript
export default function createComplexExampleBot(): ReplyBot {
	// Create a function to update the identity based on the message content
	const identityUpdater = async (message: Message): Promise<BotIdentity> => {
		// If the message contains "transform", mimic the user
		if (message.content.toLowerCase().includes('transform')) {
			return {
				name: message.author.username,
				avatarUrl: message.author.displayAvatarURL(),
			};
		}

		// Otherwise use default identity
		return {
			name: 'ComplexBot',
			avatarUrl: 'https://i.imgur.com/complex.png',
		};
	};

	return (
		new BotBuilder('ComplexBot', webhookService)
			.withAvatar('https://i.imgur.com/complex.png')
			// Add multiple triggers
			.withPatternTrigger(/\bcomplex\b/i)
			.withUserRandomTrigger(userID.Venn, 10) // 10% chance to trigger for Venn

			// Configure the dynamic identity
			.withDynamicIdentity('https://i.imgur.com/complex.png', identityUpdater)

			// Set the responses
			.respondsWithRandom([
				"I'm a complex example bot!",
				'This demonstrates multiple triggers and dynamic responses!',
			])
			.build()
	);
}
```

### ConditionResponseBot

A bot that demonstrates the condition-response pattern, which allows for directly pairing conditions with responses in a clean, declarative way.

```typescript
export default function createConditionResponseBot(): ReplyBot {
	// Create the bot builder
	const builder = new BotBuilder('ConditionBot', webhookService).withAvatar('https://i.imgur.com/example.png');

	// Track when the bot last responded
	let lastResponseTime = 0;

	// Add condition-response pairs in priority order

	// 1. Respond to "hello" with a greeting
	builder.withConditionResponse(
		new StaticResponse("Hello there! I'm a condition-response bot!"),
		(message: Message) => Promise.resolve(message.content.toLowerCase().includes('hello')),
	);

	// 2. Special response for Venn
	builder.withConditionResponse(
		new StaticResponse("Oh, it's you, Venn. What do you want now?"),
		(message: Message) => Promise.resolve(isVenn(message)),
		(message: Message) => Promise.resolve(message.content.toLowerCase().includes('condition')),
	);

	// 3. Response with time-based condition
	builder.withConditionResponse(new StaticResponse('You just talked to me! Give me a break!'), (message: Message) => {
		const currentTime = Date.now();
		const isWithinOneMinute = currentTime - lastResponseTime < 60000; // 1 minute

		if (isWithinOneMinute) {
			lastResponseTime = currentTime;
		}

		return Promise.resolve(isWithinOneMinute && message.content.toLowerCase().includes('condition'));
	});

	// Add a trigger to activate the bot
	builder.withPatternTrigger(/\b(condition|hello)\b/i);

	return builder.build();
}
```

### CustomConditionBot

A bot that demonstrates the custom condition pattern, which allows for a more declarative way to define bot behavior with lower items taking precedence.

```typescript
export default function createCustomConditionBot(): ReplyBot {
	// Create the bot builder
	const builder = new BotBuilder('CustomConditionBot', webhookService).withAvatar('https://i.imgur.com/example.png');

	// Create shared conditions
	const withinOneMinute = new TimeDelayCondition(60000, true); // 1 minute
	const cooldownFiveMinutes = new TimeDelayCondition(300000, false); // 5 minutes

	// Add conditions in order of increasing precedence (lower items take precedence)

	// Basic greeting
	builder.withCustomCondition("Hello there! I'm a custom condition bot!", new WordCondition('hello'));

	// Response for "custom"
	builder.withCustomCondition("You mentioned custom! That's what I'm all about!", new WordCondition('custom'));

	// Special response for Venn
	builder.withCustomCondition(
		"Oh, it's you, Venn. What do you want now?",
		new VennUserCondition(),
		new WordCondition('custom'),
	);

	// Response with time-based condition
	builder.withCustomCondition(
		'You just talked to me! Give me a break!',
		new WordCondition('custom'),
		withinOneMinute,
	);

	// Special response that only triggers after a cooldown
	builder.withCustomCondition(
		"I haven't seen you in a while! Welcome back!",
		new WordCondition('custom'),
		cooldownFiveMinutes,
	);

	// Add a trigger to activate the bot
	builder.withPatternTrigger(/\b(custom|hello)\b/i);

	return builder.build();
}
```

## Usage

These examples are provided for reference only and are not used in production. If you want to create a new bot:

1. Create a new file in the `src/starbunk/bots/reply-bots` directory
2. Use one of these examples as a template
3. Customize the bot's behavior, triggers, and responses
4. Register your bot in the main bot registry

The bot will be automatically loaded by the StarbunkClient when the application starts.

## Importing Examples

If you need to import these examples for testing or documentation purposes, you can use:

```typescript
import {
	createExampleBot,
	createMimicBot,
	createComplexExampleBot,
	createConditionResponseBot,
	createCustomConditionBot,
} from '../examples/bots';
```

**Note:** These examples are not meant to be used directly in production code.
