# Creating Reply Bots

Reply bots are simple modules that respond to specific messages in Discord channels. They monitor messages, detect specific triggers, and respond with customized content.

## Quick Start

1. Create a new file in `src/starbunk/bots/reply-bots/` with your bot name (e.g., `helloBot.ts`)
2. Use the template below
3. Restart the bot service

Your bot will automatically be registered and ready to respond to messages.

## Bot Architecture

All bots in the system now extend the `ReplyBot` base class using a class-based inheritance model. This provides:

- Standardized message handling through a common interface
- Automatic registration of bots via the class name
- Built-in webhook integration for rich responses
- Consistent identity management via the `getBotName()` method

## Basic Template

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

## Advanced Templates

### Random Response Bot

```typescript
import { WebhookService } from '../../../webhooks/webhookService';
import { PatternTrigger, RandomResponse } from '../botTypes';
import ReplyBot from '../replyBot';

class GreetingBot extends ReplyBot {
	constructor(webhookService: WebhookService) {
		const responses = ['Hello there!', 'Hi, how are you?', 'Greetings!', "Hey, what's up?", 'Good to see you!'];

		super(
			{ name: 'GreetingBot', avatarUrl: 'https://example.com/greeting.png' },
			new PatternTrigger(/hi|hello|hey|greetings/i),
			new RandomResponse(responses),
			webhookService,
		);
	}

	getBotName(): string {
		return 'GreetingBot';
	}
}

export default GreetingBot;
```

### Custom Trigger Bot

```typescript
import { Message } from 'discord.js';
import { WebhookService } from '../../../webhooks/webhookService';
import { TriggerCondition, StaticResponse } from '../botTypes';
import ReplyBot from '../replyBot';

// Custom trigger that responds only to messages with exactly 3 words
class ThreeWordTrigger implements TriggerCondition {
	async shouldTrigger(message: Message): Promise<boolean> {
		if (message.author.bot) return false;
		const words = message.content.trim().split(/\s+/);
		return words.length === 3;
	}
}

class ThreeWordBot extends ReplyBot {
	constructor(webhookService: WebhookService) {
		super(
			{ name: 'ThreeWordBot', avatarUrl: 'https://example.com/three.png' },
			new ThreeWordTrigger(),
			new StaticResponse('That was exactly three words!'),
			webhookService,
		);
	}

	getBotName(): string {
		return 'ThreeWordBot';
	}
}

export default ThreeWordBot;
```

### Dynamic Identity Bot

```typescript
import { Message } from 'discord.js';
import userID from '../../../discord/userID';
import { WebhookService } from '../../../webhooks/webhookService';
import { DynamicIdentity, DynamicResponse } from '../botFactory';
import { CompositeTrigger, PatternTrigger, RandomResponse } from '../botTypes';
import ReplyBot from '../replyBot';

class MimicBot extends ReplyBot {
	constructor(webhookService: WebhookService) {
		const identity = new DynamicIdentity({
			defaultName: 'MimicBot',
			defaultAvatarUrl: 'https://example.com/mimic.png',
			async updateIdentity(message: Message) {
				return {
					name: message.author.username,
					avatarUrl: message.author.displayAvatarURL(),
				};
			},
		});

		const trigger = new PatternTrigger(/mimic/i);

		const responses = [
			"I'm copying you!",
			"Look at me, I'm just like you!",
			'Imitation is the sincerest form of flattery.',
		];

		const responseGenerator = new DynamicResponse(identity, new RandomResponse(responses));

		super(identity, trigger, responseGenerator, webhookService);
	}

	getBotName(): string {
		return 'MimicBot';
	}
}

export default MimicBot;
```

## Testing Your Bot

Add a test in `src/__tests__/starbunk/bots/reply-bots/`:

```typescript
import { Message } from 'discord.js';
import { createMockWebhookService } from '@/__tests__/mocks/serviceMocks';
import { patchReplyBot } from '@/__tests__/helpers/replyBotHelper';
import HelloBot from '@/starbunk/bots/reply-bots/helloBot';
import ReplyBot from '@/starbunk/bots/replyBot';

describe('HelloBot', () => {
	let helloBot: ReplyBot;
	let mockMessage: Partial<Message>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;

	beforeEach(() => {
		mockWebhookService = createMockWebhookService();
		mockMessage = {
			content: '',
			author: { bot: false, id: 'user-id' },
			channel: { id: 'channel-id' },
		} as Partial<Message>;

		helloBot = new HelloBot(mockWebhookService);
		patchReplyBot(helloBot, mockWebhookService);
	});

	it('should respond to hello messages', async () => {
		mockMessage.content = 'hello there';
		await helloBot.handleMessage(mockMessage as Message);
		expect(mockWebhookService.writeMessage).toHaveBeenCalled();
	});

	it('should not respond to unrelated messages', async () => {
		mockMessage.content = 'something else';
		await helloBot.handleMessage(mockMessage as Message);
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});
```

## Tips & Best Practices

1. **Extend ReplyBot**: Always extend the ReplyBot base class
2. **Implement getBotName**: This method is required for registration
3. **Use Provided Components**: Use the built-in trigger and response classes when possible
4. **Keep It Simple**: Reply bots should do one thing well
5. **Test Thoroughly**: Write tests for your bot's behavior
6. **Handle Edge Cases**: Account for bot messages, empty content, etc.
7. **Use Composite Triggers**: Combine triggers for complex conditions
8. **Avoid Race Conditions**: Be careful with async message handling

## Bot Registration Process

The system automatically registers all bots that:

1. Export a class as the default export
2. Extend the ReplyBot base class
3. Implement the required getBotName() method

```typescript
// From starbunkClient.ts - this happens automatically
registerBots = async (): Promise<void> => {
	try {
		const botFiles = readdirSync('./src/starbunk/bots/reply-bots');
		this.logger.info(`Found ${botFiles.length} reply bots to register`);

		for (const file of botFiles) {
			try {
				// Import the bot module
				const botModule = await import(`./bots/reply-bots/${file}`);

				// Create an instance of the bot
				const bot = new botModule.default(this.webhookService);

				// Register it with its name from getBotName()
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
