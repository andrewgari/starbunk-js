# Creating Reply Bots

Reply bots are simple modules that respond to specific messages in Discord channels. They monitor messages, detect specific triggers, and respond with customized content.

## Quick Start

1. Create a new file in `src/starbunk/bots/reply-bots/` with your bot name (e.g., `helloBot.ts`)
2. Use one of the templates below
3. Restart the bot service

Your bot will automatically be registered and ready to respond to messages.

## Bot Architecture

All bots in the system extend the `ReplyBot` base class using a class-based inheritance model or are created with our new `BotBuilder` pattern for simpler implementation.

## Simple Template: Builder Pattern (Recommended)

The simplest way to create a new bot is to use the Builder pattern:

```typescript
import { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import ReplyBot from '../replyBot';

export default function createGreetingBot(webhookService: WebhookService): ReplyBot {
	return new BotBuilder('GreetingBot', webhookService)
		.withAvatar('https://example.com/greeting.png')
		.withPatternTrigger(/hello|hi|hey/i)
		.respondsWithStatic('Hello there!')
		.build();
}
```

## Advanced Builder Examples

### Random Response Bot

```typescript
import { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import ReplyBot from '../replyBot';

export default function createRandomGreetingBot(webhookService: WebhookService): ReplyBot {
	const responses = ['Hello there!', 'Hi, how are you?', 'Greetings!', "Hey, what's up?", 'Good to see you!'];

	return new BotBuilder('GreetingBot', webhookService)
		.withAvatar('https://example.com/greeting.png')
		.withPatternTrigger(/hello|hi|hey/i)
		.respondsWithRandom(responses)
		.build();
}
```

### Multiple Trigger Bot

```typescript
import userID from '../../../discord/userID';
import { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import ReplyBot from '../replyBot';

export default function createMultiTriggerBot(webhookService: WebhookService): ReplyBot {
	return new BotBuilder('MultiBot', webhookService)
		.withAvatar('https://example.com/multibot.png')
		.withPatternTrigger(/multi/i)
		.withUserRandomTrigger(userID.Venn, 10) // 10% chance for Venn
		.respondsWithStatic('Multiple triggers activated!')
		.build();
}
```

### Dynamic Identity Bot

```typescript
import { Message } from 'discord.js';
import userID from '../../../discord/userID';
import { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import { BotIdentity } from '../botTypes';
import ReplyBot from '../replyBot';

export default function createMimicBot(webhookService: WebhookService): ReplyBot {
	const responses = [
		"I'm copying you!",
		"Look at me, I'm just like you!",
		'Imitation is the sincerest form of flattery.',
	];

	const identityUpdater = async (message: Message): Promise<BotIdentity> => {
		return {
			name: message.author.username,
			avatarUrl: message.author.displayAvatarURL(),
		};
	};

	return new BotBuilder('MimicBot', webhookService)
		.withPatternTrigger(/mimic/i)
		.withUserRandomTrigger(userID.Venn, 5)
		.respondsWithRandom(responses)
		.withDynamicIdentity('https://i.imgur.com/default.png', identityUpdater)
		.build();
}
```

### Using Factory Functions

For even more simplicity, you can use the provided factory functions:

```typescript
import { WebhookService } from '../../../webhooks/webhookService';
import { createPatternBot, createRandomResponseBot } from '../botFactory';
import ReplyBot from '../replyBot';

export default function createSimpleBot(webhookService: WebhookService): ReplyBot {
	return createPatternBot(
		'SimpleBot',
		/simple/i,
		'This is a simple bot!',
		'https://example.com/simple.png',
		webhookService,
	);
}
```

## Traditional Class-Based Template (Legacy)

You can still use the traditional class-based approach if needed:

```typescript
import { WebhookService } from '../../../webhooks/webhookService';
import { PatternTrigger, StaticResponse } from '../botTypes';
import ReplyBot from '../replyBot';

class HelloBot extends ReplyBot {
	constructor(webhookService: WebhookService) {
		// Configure the bot with identity, trigger, and response
		super(
			{ name: 'HelloBot', avatarUrl: 'https://example.com/avatar.png' },
			new PatternTrigger(/hello/i),
			new StaticResponse('Hello there!'),
			webhookService,
		);
	}

	getBotName(): string {
		// Required method for bot registration
		return 'HelloBot';
	}
}

export default HelloBot;
```

## Testing Your Bot

For builder-pattern bots:

```typescript
import { Message } from 'discord.js';
import { createMockWebhookService } from '@/__tests__/mocks/serviceMocks';
import { patchReplyBot } from '@/__tests__/helpers/replyBotHelper';
import createExampleBot from '@/starbunk/bots/reply-bots/exampleBot';
import ReplyBot from '@/starbunk/bots/replyBot';

describe('ExampleBot', () => {
	let exampleBot: ReplyBot;
	let mockMessage: Partial<Message>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;

	beforeEach(() => {
		mockWebhookService = createMockWebhookService();
		mockMessage = {
			content: '',
			author: { bot: false, id: 'user-id' },
			channel: { id: 'channel-id' },
		} as Partial<Message>;

		exampleBot = createExampleBot(mockWebhookService);
		patchReplyBot(exampleBot, mockWebhookService);
	});

	it('should respond to example messages', async () => {
		mockMessage.content = 'this is an example';
		await exampleBot.handleMessage(mockMessage as Message);
		expect(mockWebhookService.writeMessage).toHaveBeenCalled();
	});
});
```

## Tips & Best Practices

1. **Use the Builder Pattern**: The builder pattern is much simpler and cleaner
2. **Keep Bots Simple**: Each bot should do one thing well
3. **Reuse Common Patterns**: Use factory functions for common bot types
4. **Test Thoroughly**: Write tests for your bot's behavior
5. **Handle Edge Cases**: Account for bot messages, empty content, etc.
6. **Use Composite Triggers**: Combine triggers for complex conditions

## Bot Registration Process

The system automatically registers all bots:

1. For class-based bots: Instantiate the class and call `getBotName()`
2. For builder/factory bots: Call the function and use the returned bot

```typescript
// From starbunkClient.ts - this happens automatically
registerBots = async (): Promise<void> => {
	try {
		const botFiles = readdirSync('./src/starbunk/bots/reply-bots');

		for (const file of botFiles) {
			try {
				// Import the bot module
				const botModule = await import(`./bots/reply-bots/${file}`);

				// Handle both class-based and factory-based bots
				const bot =
					typeof botModule.default === 'function'
						? botModule.default(this.webhookService) // Factory function
						: new botModule.default(this.webhookService); // Class constructor

				// Register it
				const botName = bot.getBotName();
				this.bots.set(botName, bot);

				this.logger.success(`Registered Bot: ${botName} 🤖`);
			} catch (err) {
				this.logger.error(`Error registering bot from file ${file}:`, err);
			}
		}
	} catch (error) {
		this.logger.error('Error registering bots:', error);
	}
};
```
