# Bot Refactoring Guide

This guide provides detailed instructions for refactoring bots to the new architecture.

## Overview

The new architecture separates bot components into distinct files:

- **Conditions**: Classes that determine when a bot should respond
- **Responses**: Classes that generate the bot's response
- **Identity**: Functions that determine the bot's name and avatar
- **Utils**: Helper functions specific to the bot

## Step-by-Step Refactoring Process

### 1. Create Directory Structure

```bash
mkdir -p src/starbunk/bots/reply-bots/[botName]/{conditions,responses,identity,utils}
```

### 2. Identify Components

Analyze the bot's implementation to identify:

- **Trigger conditions**: What makes the bot respond?
- **Response generators**: How does the bot generate its response?
- **Identity updaters**: Does the bot change its identity based on context?

### 3. Extract Conditions

Create a file for each condition in the `conditions` directory:

```typescript
// src/starbunk/bots/reply-bots/[botName]/conditions/[conditionName].ts
import { TriggerCondition } from '@/starbunk/bots/botTypes';
import { Message } from 'discord.js';

export class MyCondition implements TriggerCondition {
	async shouldTrigger(message: Message): Promise<boolean> {
		// Implement condition logic
		return false;
	}
}
```

### 4. Extract Response Generators

Create a file for each response generator in the `responses` directory:

```typescript
// src/starbunk/bots/reply-bots/[botName]/responses/[responseName].ts
import { ResponseGenerator } from '@/starbunk/bots/botTypes';
import { Message } from 'discord.js';

export class MyResponseGenerator implements ResponseGenerator {
	async generateResponse(message: Message): Promise<string> {
		// Implement response generation logic
		return 'Response';
	}
}
```

### 5. Extract Identity Updaters (if applicable)

If the bot has dynamic identity, create a file in the `identity` directory:

```typescript
// src/starbunk/bots/reply-bots/[botName]/identity/[botName]IdentityUpdater.ts
import { BotIdentity } from '@/starbunk/bots/botTypes';
import { Message } from 'discord.js';

export async function updateIdentity(message: Message): Promise<BotIdentity> {
	// Implement identity update logic
	return {
		name: 'BotName',
		avatarUrl: 'https://example.com/avatar.png',
	};
}
```

### 6. Update Main Bot File

Update the main bot file to use the extracted components:

```typescript
// src/starbunk/bots/reply-bots/[botName]/[botName].ts
import webhookService, { WebhookService } from '@/webhooks/webhookService';
import { BotBuilder } from '../../botBuilder';
import ReplyBot from '../../replyBot';
import { BOT_NAME, AVATAR_URL } from './[botName]Model';

// Import the extracted components
import { MyCondition } from './conditions/[conditionName]';
import { MyResponseGenerator } from './responses/[responseName]';
import { updateIdentity } from './identity/[botName]IdentityUpdater';

export default function create[BotName](
  webhookSvc: WebhookService = webhookService
): ReplyBot {
  // Create instances of conditions and response generators
  const myCondition = new MyCondition();
  const myResponseGenerator = new MyResponseGenerator();

  // Build and return the bot
  return new BotBuilder(BOT_NAME, webhookSvc)
    .withAvatar(AVATAR_URL)
    .withConditionResponse(
      myResponseGenerator,
      AVATAR_URL,
      myCondition
    )
    .build();
}
```

### 7. Update Tests

Update the tests to use the new components:

```typescript
// src/starbunk/bots/reply-bots/[botName]/[botName].test.ts
import { mockWebhookServiceDefault } from '@/tests/mocks/serviceMocks';
jest.mock('@/webhooks/webhookService', () => mockWebhookServiceDefault());

// Mock the condition and response generator
jest.mock('./conditions/[conditionName]', () => ({
	MyCondition: jest.fn().mockImplementation(() => ({
		shouldTrigger: jest.fn().mockResolvedValue(true),
	})),
}));

jest.mock('./responses/[responseName]', () => ({
	MyResponseGenerator: jest.fn().mockImplementation(() => ({
		generateResponse: jest.fn().mockResolvedValue('Test response'),
	})),
}));

// Rest of the test...
```

## Examples

### Simple Bot (SpiderBot)

SpiderBot is a simple bot with a single condition and response:

```typescript
// src/starbunk/bots/reply-bots/spiderBot/conditions/spiderManCondition.ts
import { TriggerCondition } from '@/starbunk/bots/botTypes';
import { Message } from 'discord.js';

export class SpiderManCondition implements TriggerCondition {
	private readonly spidermanPattern = /\b(spiderman|spider\s+man)\b/i;
	private readonly correctPattern = /\bspider-man\b/i;

	async shouldTrigger(message: Message): Promise<boolean> {
		if (message.content.match(this.correctPattern)) {
			return false;
		}
		return this.spidermanPattern.test(message.content);
	}
}
```

```typescript
// src/starbunk/bots/reply-bots/spiderBot/responses/spiderManCorrectionGenerator.ts
import { ResponseGenerator } from '@/starbunk/bots/botTypes';
import { SPIDERMAN_CORRECTION } from '../spiderBotModel';

export class SpiderManCorrectionGenerator implements ResponseGenerator {
	async generateResponse(): Promise<string> {
		return SPIDERMAN_CORRECTION;
	}
}
```

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

### Complex Bot (GuyBot)

GuyBot is a more complex bot with combined conditions, random responses, and dynamic identity:

```typescript
// src/starbunk/bots/reply-bots/guyBot/conditions/guyBotCondition.ts
import { TriggerCondition } from '@/starbunk/bots/botTypes';
import { OneCondition } from '@/starbunk/bots/triggers/conditions/oneCondition';
import { PatternCondition } from '@/starbunk/bots/triggers/conditions/patternCondition';
import { Patterns } from '@/starbunk/bots/triggers/conditions/patterns';
import { RandomChanceCondition } from '@/starbunk/bots/triggers/conditions/randomChanceCondition';
import { AllConditions } from '@/starbunk/bots/triggers/conditions/allConditions';
import { getGuyCondition } from '@/starbunk/bots/triggers/userConditions';
import { Message } from 'discord.js';
import { RANDOM_RESPONSE_CHANCE_PERCENT } from '../guyBotModel';

export class GuyBotCondition implements TriggerCondition {
	private combinedCondition: TriggerCondition;

	constructor() {
		const guyUserCondition = getGuyCondition();
		this.combinedCondition = new OneCondition(
			new PatternCondition(Patterns.WORD_GUY),
			new AllConditions(new RandomChanceCondition(RANDOM_RESPONSE_CHANCE_PERCENT), guyUserCondition),
		);
	}

	async shouldTrigger(message: Message): Promise<boolean> {
		return this.combinedCondition.shouldTrigger(message);
	}
}
```

```typescript
// src/starbunk/bots/reply-bots/guyBot/responses/randomGuyResponseGenerator.ts
import { ResponseGenerator } from '@/starbunk/bots/botTypes';
import { RESPONSES } from '../guyBotModel';

export class RandomGuyResponseGenerator implements ResponseGenerator {
	async generateResponse(): Promise<string> {
		const randomIndex = Math.floor(Math.random() * RESPONSES.length);
		return RESPONSES[randomIndex];
	}
}
```

```typescript
// src/starbunk/bots/reply-bots/guyBot/identity/guyBotIdentityUpdater.ts
import userID from '@/discord/userID';
import { BotIdentity } from '@/starbunk/bots/botTypes';
import { getUserIdentity } from '@/starbunk/bots/identity/userIdentity';
import { Message } from 'discord.js';
import { BOT_NAME, GUY_BOT_AVATAR_URL } from '../guyBotModel';

export async function updateGuyBotIdentity(message: Message): Promise<BotIdentity> {
	if (message.author.id === userID.Guy) {
		return await getUserIdentity(message);
	}
	return {
		name: BOT_NAME,
		avatarUrl: GUY_BOT_AVATAR_URL,
	};
}
```

## Common Patterns

### Pattern Condition

For bots that respond to specific patterns in messages:

```typescript
import { TriggerCondition } from '@/starbunk/bots/botTypes';
import { Patterns } from '@/starbunk/bots/triggers/conditions/patterns';
import { Message } from 'discord.js';

export class PatternBasedCondition implements TriggerCondition {
	async shouldTrigger(message: Message): Promise<boolean> {
		return Patterns.SOME_PATTERN.test(message.content);
	}
}
```

### Random Response Generator

For bots that select a random response from a list:

```typescript
import { ResponseGenerator } from '@/starbunk/bots/botTypes';
import { RESPONSES } from '../botModel';

export class RandomResponseGenerator implements ResponseGenerator {
	async generateResponse(): Promise<string> {
		const randomIndex = Math.floor(Math.random() * RESPONSES.length);
		return RESPONSES[randomIndex];
	}
}
```

### User-Based Identity

For bots that change identity based on the user:

```typescript
import userID from '@/discord/userID';
import { BotIdentity } from '@/starbunk/bots/botTypes';
import { Message } from 'discord.js';
import { BOT_NAME, AVATAR_URL } from '../botModel';

export async function updateIdentity(message: Message): Promise<BotIdentity> {
	if (message.author.id === userID.SomeUser) {
		return {
			name: 'Special Name',
			avatarUrl: 'Special Avatar URL',
		};
	}
	return {
		name: BOT_NAME,
		avatarUrl: AVATAR_URL,
	};
}
```
