# Creating Reply Bots

Reply bots are simple modules that respond to specific messages in Discord channels. They monitor messages, detect specific triggers, and respond with customized content.

## Quick Start

1. Create a new file in `src/starbunk/bots/reply-bots/` with your bot name (e.g., `helloBot.ts`)
2. Use the template below
3. Restart the bot service

Your bot will automatically be registered and ready to respond to messages.

## Basic Template

```typescript
import { Message } from 'discord.js';
import { Logger } from '../../../services/logger';
import StarbunkClient from '../../starbunkClient';
import ReplyBot from '../replyBot';

export default class HelloBot implements ReplyBot {
	private client: StarbunkClient;

	constructor(client: StarbunkClient) {
		this.client = client;
		Logger.info('HelloBot initialized');
	}

	getBotName(): string {
		return 'HelloBot';
	}

	handleMessage(message: Message): void {
		// Ignore bot messages to prevent loops
		if (message.author.bot) return;

		// Define your trigger - what the bot should respond to
		if (message.content.toLowerCase().includes('hello')) {
			// Reply to the message
			message.reply('Hello there!');
		}
	}
}
```

## Advanced Templates

### Pattern Matching Bot

```typescript
import { Message } from 'discord.js';
import { Logger } from '../../../services/logger';
import StarbunkClient from '../../starbunkClient';
import ReplyBot from '../replyBot';

export default class PatternBot implements ReplyBot {
	private client: StarbunkClient;
	private triggers: Array<{ pattern: RegExp; response: string }>;

	constructor(client: StarbunkClient) {
		this.client = client;
		this.triggers = [
			{ pattern: /hello world/i, response: 'Hello to you too!' },
			{ pattern: /how are you/i, response: "I'm doing great, thanks for asking!" },
			{ pattern: /good morning/i, response: 'Good morning! Hope you have a great day!' },
		];
		Logger.info('PatternBot initialized');
	}

	getBotName(): string {
		return 'PatternBot';
	}

	handleMessage(message: Message): void {
		if (message.author.bot) return;

		for (const trigger of this.triggers) {
			if (trigger.pattern.test(message.content)) {
				message.reply(trigger.response);
				return; // Stop after first match
			}
		}
	}
}
```

### Command Bot

```typescript
import { Message } from 'discord.js';
import { Logger } from '../../../services/logger';
import StarbunkClient from '../../starbunkClient';
import ReplyBot from '../replyBot';

export default class CommandBot implements ReplyBot {
	private client: StarbunkClient;
	private prefix: string;
	private commands: Record<string, (message: Message, args: string[]) => void>;

	constructor(client: StarbunkClient) {
		this.client = client;
		this.prefix = '!'; // Command prefix

		// Define available commands
		this.commands = {
			help: (message, args) => {
				message.reply('Available commands: !help, !ping, !roll');
			},
			ping: (message, args) => {
				message.reply('Pong!');
			},
			roll: (message, args) => {
				const sides = parseInt(args[0]) || 6;
				const result = Math.floor(Math.random() * sides) + 1;
				message.reply(`You rolled a ${result} (d${sides})`);
			},
		};

		Logger.info('CommandBot initialized');
	}

	getBotName(): string {
		return 'CommandBot';
	}

	handleMessage(message: Message): void {
		if (message.author.bot) return;
		if (!message.content.startsWith(this.prefix)) return;

		const args = message.content.slice(this.prefix.length).trim().split(/ +/);
		const command = args.shift()?.toLowerCase();

		if (command && this.commands[command]) {
			this.commands[command](message, args);
		}
	}
}
```

## Testing Your Bot

Add a simple test in `src/__tests__/starbunk/bots/`:

```typescript
import { Message } from 'discord.js';
import StarbunkClient from '../../../starbunk/starbunkClient';
import HelloBot from '../../../starbunk/bots/reply-bots/helloBot';

describe('HelloBot', () => {
	let bot: HelloBot;
	let mockClient: Partial<StarbunkClient>;
	let mockMessage: Partial<Message>;

	beforeEach(() => {
		mockClient = {} as StarbunkClient;
		mockMessage = {
			content: 'test message',
			author: { bot: false },
			reply: jest.fn(),
		} as unknown as Partial<Message>;

		bot = new HelloBot(mockClient as StarbunkClient);
	});

	it('should reply to hello messages', () => {
		mockMessage.content = 'hello there';
		bot.handleMessage(mockMessage as Message);
		expect(mockMessage.reply).toHaveBeenCalledWith('Hello there!');
	});

	it('should not reply to other messages', () => {
		mockMessage.content = 'something else';
		bot.handleMessage(mockMessage as Message);
		expect(mockMessage.reply).not.toHaveBeenCalled();
	});
});
```

## Tips & Best Practices

1. **Keep it simple**: Reply bots should do one thing well
2. **Avoid high frequency triggers**: Don't make bots that trigger on common words
3. **Add rate limiting**: For frequently used bots, consider adding rate limiting
4. **Test extensively**: Make sure your bot doesn't have unintended side effects
5. **Use webhooks** for complex formatting: `this.client.webhookService.writeMessage()`
6. **Handle errors gracefully**: Wrap logic in try/catch blocks

## Auto-Registration

The StarbunkClient automatically registers all bots in the `src/starbunk/bots/reply-bots/` directory. You don't need to manually register your bot - just place your file in the correct directory.

```typescript
// From starbunkClient.ts - this happens automatically
registerBots = async (): Promise<void> => {
	try {
		const botFiles = readdirSync('./src/starbunk/bots/reply-bots');
		this.logger.info(`Found ${botFiles.length} reply bots to register`);

		for (const file of botFiles) {
			// ... loading logic
			const bot = new botModule.default(this);
			this.bots.set(bot.getBotName(), bot);
		}
	} catch (error) {
		this.logger.error('Error registering bots:', error as Error);
	}
};
```
