# Bot Builder Pattern

The Bot Builder pattern is a simplified way to create bots in the Starbunk system. It provides a fluent interface that makes bot creation concise, readable, and maintainable.

## Why Use the Bot Builder Pattern?

- **Simplified Creation**: Build bots with much less code
- **Fluent Interface**: Chain methods together for a clean, readable API
- **Error Prevention**: The builder validates your configuration and prevents common mistakes
- **Reduced Boilerplate**: No need to handle complex class inheritance and constructor logic

## Basic Usage

The core pattern for creating a bot with the builder is:

```typescript
import { BotBuilder } from '../botBuilder';
import ReplyBot from '../replyBot';
import webhookService from '../../../webhooks/webhookService';

export default function createSimpleBot(): ReplyBot {
	return new BotBuilder('MyBot', webhookService)
		.withAvatar('https://example.com/avatar.png')
		.withPatternTrigger(/trigger/i)
		.respondsWithStatic('Response message')
		.build();
}
```

## Available Methods

The Bot Builder provides the following methods:

### Identity Configuration

- `withAvatar(url: string)`: Set the avatar URL for the bot
- `withDynamicIdentity(defaultAvatarUrl: string, updateFn: (message) => Promise<BotIdentity>)`: Configure a dynamic identity that changes based on messages

### Trigger Configuration

- `withPatternTrigger(pattern: RegExp)`: Add a pattern/regex trigger
- `withUserRandomTrigger(userId: string, chance: number)`: Add a random trigger for specific users (chance: 0-100%)
- `withCustomTrigger(trigger: TriggerCondition)`: Add a custom trigger implementation

### Response Configuration

- `respondsWithStatic(response: string)`: Configure a static response message
- `respondsWithRandom(responses: string[])`: Configure random responses from a list
- `respondsWithCustom(generator: ResponseGenerator)`: Configure a custom response generator

### Building

- `build()`: Validate and finalize the bot configuration, returning a ReplyBot instance

## Examples

### Basic Random Response Bot

```typescript
import webhookService from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import ReplyBot from '../replyBot';

export default function createGreetingBot(): ReplyBot {
	const responses = ['Hello there!', 'Hi, how are you?', 'Greetings!', "Hey, what's up?", 'Good to see you!'];

	return new BotBuilder('GreetingBot', webhookService)
		.withAvatar('https://example.com/greeting.png')
		.withPatternTrigger(/hello|hi|hey/i)
		.respondsWithRandom(responses)
		.build();
}
```

### Multi-Trigger Bot

```typescript
import webhookService from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import ReplyBot from '../replyBot';

export default function createMultiTriggerBot(): ReplyBot {
	return new BotBuilder('MultiBot', webhookService)
		.withAvatar('https://example.com/multi.png')
		.withPatternTrigger(/trigger1/i)
		.withPatternTrigger(/trigger2/i)
		.respondsWithStatic('Triggered!')
		.build();
}
```

### Dynamic Identity Bot

```typescript
import { Message } from 'discord.js';
import userID from '../../../discord/userID';
import webhookService from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import { BotIdentity } from '../botTypes';
import ReplyBot from '../replyBot';

export default function createMimicBot(): ReplyBot {
	const responses = ["I'm copying you!", "Look at me, I'm just like you!"];

	const identityUpdater = async (message: Message): Promise<BotIdentity> => {
		return {
			name: message.author.username,
			avatarUrl: message.author.displayAvatarURL(),
		};
	};

	return new BotBuilder('MimicBot', webhookService)
		.withPatternTrigger(/\bmimic\b/i)
		.withUserRandomTrigger(userID.Venn, 5) // 5% chance to trigger for Venn
		.withDynamicIdentity('https://i.imgur.com/default.png', identityUpdater)
		.respondsWithRandom(responses)
		.build();
}
```

## Best Practices

1. **Keep Bot Files Small**: Focus on the unique behavior of your bot
2. **Use Descriptive Names**: Name your bot and functions clearly
3. **Group Related Bots**: Create helper functions for shared functionality between related bots
4. **Test Triggers Thoroughly**: Make sure your triggers activate only in intended cases
5. **Document Special Behavior**: Add comments for any non-obvious behavior
