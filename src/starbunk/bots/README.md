# Bot Architecture

This document explains the architecture of the bot system in the Starbunk project.

## Directory Structure

```
src/starbunk/bots/
├── common/                  # Common components shared across bots
│   ├── conditions/          # Base condition classes
│   ├── responses/           # Base response generators
│   ├── identity/            # Base identity updaters
│   └── utils/               # Shared utilities
├── reply-bots/              # Individual bot implementations
│   ├── [botName]/           # Each bot has its own directory
│   │   ├── conditions/      # Bot-specific conditions
│   │   ├── responses/       # Bot-specific response generators
│   │   ├── identity/        # Bot-specific identity updaters
│   │   ├── utils/           # Bot-specific utilities
│   │   ├── [botName].ts     # Main bot file (factory function)
│   │   ├── [botName]Model.ts # Constants and static data
│   │   └── [botName].test.ts # Tests
├── triggers/                # Trigger conditions
│   └── conditions/          # Condition implementations
├── botTypes.ts              # Core interfaces
├── botBuilder.ts            # Bot builder class
└── replyBot.ts              # Base bot class
```

## Core Components

### Bot Types

The `botTypes.ts` file defines the core interfaces used throughout the bot system:

- `BotIdentity`: Defines the name and avatar URL of a bot
- `TriggerCondition`: Interface for conditions that determine when a bot should respond
- `ResponseGenerator`: Interface for generators that produce bot responses

### Bot Builder

The `BotBuilder` class provides a fluent API for creating bots with various conditions and responses.

### Reply Bot

The `ReplyBot` class is the base class for all bots, handling message processing and response generation.

## Creating a New Bot

To create a new bot, follow these steps:

1. Create a new directory under `reply-bots` with your bot's name
2. Create a model file with constants and static data
3. Create condition classes in the `conditions` directory
4. Create response generators in the `responses` directory
5. Create the main bot file that wires everything together
6. Create tests for your bot

## Examples

### Simple Bot Example (SpiderBot)

SpiderBot is a simple bot that corrects people who write "spiderman" without a hyphen:

```typescript
// src/starbunk/bots/reply-bots/spiderBot/spiderBot.ts
import webhookService, { WebhookService } from '@/webhooks/webhookService';
import { BotBuilder } from '../../botBuilder';
import ReplyBot from '../../replyBot';
import { AVATAR_URL, BOT_NAME } from './spiderBotModel';
import { SpiderManCondition } from './conditions/spiderManCondition';
import { SpiderManCorrectionGenerator } from './responses/spiderManCorrectionGenerator';

export default function createSpiderBot(webhookSvc: WebhookService = webhookService): ReplyBot {
	const spiderManCondition = new SpiderManCondition();
	const correctionGenerator = new SpiderManCorrectionGenerator();

	return new BotBuilder(BOT_NAME, webhookSvc)
		.withAvatar(AVATAR_URL)
		.withConditionResponse(correctionGenerator, AVATAR_URL, spiderManCondition)
		.build();
}
```

### Complex Bot Example (BlueBot)

BlueBot is a more complex bot with multiple conditions and responses:

```typescript
// src/starbunk/bots/reply-bots/blueBot/blueBot.ts
export function createBlueBot(config: BluBotConfig = {}): ReplyBot {
	const niceRequestCondition = new BluNiceRequestCondition();
	const niceResponseGenerator = new BluNiceResponseGenerator(niceRequestCondition);
	const recentBluMessageCondition = new RecentBluMessageCondition(5);
	const cooldownCondition = new CooldownCondition(24 * 60, 'BlueBot_NavySeal');
	const initialResponseGenerator = new InitialBluResponseGenerator();
	const cheekyResponseGenerator = new CheekyBluResponseGenerator();
	const navySealResponseGenerator = new NavySealResponseGenerator();

	// Build bot with the conversation flow pattern
	return (
		new BotBuilder('BlueBot', webhookService)
			.withAvatar(AVATAR_URLS.DEFAULT)
			.withDynamicIdentity(AVATAR_URLS.DEFAULT, updateBlueBotIdentity)
			.withConditionResponse(
				initialResponseGenerator,
				AVATAR_URLS.DEFAULT,
				new AllConditions(initialTrigger, new NotCondition(recentBluMessageCondition)),
			)
			// Additional conditions and responses...
			.build()
	);
}
```

## Best Practices

1. **Separation of Concerns**: Keep conditions, responses, and identity logic separate
2. **Single Responsibility**: Each class should have a single responsibility
3. **Testability**: Design components to be easily testable in isolation
4. **Reusability**: Extract common patterns into reusable components
5. **Documentation**: Document the purpose and behavior of each component
