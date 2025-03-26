# Quick Start Guide: Creating a Simple Reply Bot

This guide walks through creating a minimal reply bot for the Starbunk system.

## Prerequisites

1. Node.js (>=16.0.0)
2. A Discord application with a bot token
3. Basic TypeScript knowledge

## Step 1: Clone and Setup

```bash
# Clone the repository
git clone https://github.com/andrewgari/starbunk-js.git
cd starbunk-js

# Install dependencies
npm install

# Create .env file with your tokens
echo "STARBUNK_TOKEN=your_discord_token" > .env
echo "CLIENT_ID=your_client_id" >> .env
echo "GUILD_ID=your_guild_id" >> .env
```

## Step 2: Create a Simple Reply Bot

Create a file in `src/starbunk/bots/reply-bots/helloBot.ts`:

```typescript
import { Message, TextChannel } from 'discord.js';
import { ILogger } from '../../../services/Logger';
import { getBotAvatar, getBotName, getBotPattern, getBotResponse } from '../botConstants';
import ReplyBot from '../replyBot';

export default class HelloBot extends ReplyBot {
	public readonly botName: string = 'HelloBot';
	public readonly avatarUrl: string = 'https://i.imgur.com/YourAvatarUrl.png';

	constructor(logger?: ILogger) {
		super(logger);
	}

	handleMessage(message: Message): void {
		// Ignore bot messages to prevent loops
		if (message.author.bot) return;

		// Respond to messages containing "hello"
		if (/\bhello\b/i.test(message.content)) {
			this.logger.debug(`User ${message.author.username} triggered HelloBot`);
			this.sendReply(message.channel as TextChannel, 'Hello there! 👋');
		}
	}
}
```

## Step 3: Add Bot Constants (Optional)

If you prefer using the constants system, add your bot to `src/starbunk/bots/botConstants.ts`:

```typescript
// Add this to the BotConstants object
Hello: {
  Name: 'HelloBot',
  Avatars: {
    Default: 'https://i.imgur.com/YourAvatarUrl.png'
  },
  Patterns: {
    Default: /\bhello\b/i
  },
  Responses: {
    Default: 'Hello there! 👋'
  }
}
```

Then modify your bot to use these constants:

```typescript
public readonly botName: string = getBotName('Hello');
public readonly avatarUrl: string = getBotAvatar('Hello', 'Default');

handleMessage(message: Message): void {
  if (message.author.bot) return;

  if (getBotPattern('Hello', 'Default')?.test(message.content)) {
    this.sendReply(message.channel as TextChannel, getBotResponse('Hello', 'Default'));
  }
}
```

## Step 4: Build and Run

```bash
# Build the project
npm run build

# Start the bot
npm start
```

## How It Works

1. The `StarbunkClient` automatically loads all bot files in the `reply-bots` directory
2. When a message is received, the client passes it to all registered bots
3. Each bot checks if the message matches its trigger pattern
4. If matched, the bot responds using the webhook service

## Creating a Voice Bot

You can create a voice bot that responds to voice channel events:

### Step 1: Create Bot Directory

Create a directory structure for your voice bot:

```bash
mkdir -p src/starbunk/bots/voice-bots/your-voice-bot
cd src/starbunk/bots/voice-bots/your-voice-bot
```

### Step 2: Create Bot Files

Create three files:

1. `constants.ts`:
```typescript
export const YOUR_BOT_NAME = 'Your Voice Bot';
export const YOUR_BOT_AVATAR = 'https://example.com/avatar.png';
```

2. `triggers.ts`:
```typescript
import { createVoiceTrigger } from '../../core/voice-bot-builder';
import { userJoinedVoiceChannel } from '../../core/voice-conditions';

export const joinTrigger = createVoiceTrigger({
  name: 'join-trigger',
  condition: userJoinedVoiceChannel(),
  handler: async (oldState, newState) => {
    const member = newState.member;
    const channel = newState.channel;

    // Example: Log when users join voice channels
    console.log(`${member?.displayName} joined ${channel?.name}`);
  }
});
```

3. `index.ts`:
```typescript
import { createVoiceBot } from '../../core/voice-bot-builder';
import { YOUR_BOT_AVATAR, YOUR_BOT_NAME } from './constants';
import { joinTrigger } from './triggers';

export default createVoiceBot({
  name: 'YourVoiceBot',
  description: 'A bot that responds to voice events',
  defaultIdentity: {
    botName: YOUR_BOT_NAME,
    avatarUrl: YOUR_BOT_AVATAR
  },
  triggers: [joinTrigger]
});
```

### Step 3: Test Your Bot

Create a test file in `__tests__/your-voice-bot.test.ts`:

```typescript
import { VoiceState } from 'discord.js';
import { createMockLogger } from '../../../../services/logger';
import { createMockVoiceState } from '../../../../discord/testUtils';
import YourVoiceBot from '../index';

describe('YourVoiceBot', () => {
  let bot: YourVoiceBot;
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    bot = new YourVoiceBot(mockLogger);
  });

  it('should handle user joining voice channel', () => {
    const oldState = createMockVoiceState({ channelId: null });
    const newState = createMockVoiceState({ channelId: '123' });

    bot.handleVoiceStateUpdate(oldState, newState);

    expect(mockLogger.debug).toHaveBeenCalled();
  });
});
```

### Step 4: Managing Your Bot

Your voice bot can be managed using Discord slash commands:

```
/bot enable YourVoiceBot    # Enable the bot
/bot disable YourVoiceBot   # Disable the bot
/bot volume YourVoiceBot 50 # Set volume to 50%
/bot list-bots             # List all bots including voice bots
```

## Next Steps

- Add more complex voice event triggers
- Implement channel management logic
- Add voice state tracking
- Create voice channel utilities
- Explore voice bot interactions with other bots

## Debugging

If your bot isn't working:

1. Check the console logs for any errors
2. Verify your bot has the proper permissions in Discord
3. Make sure your regex pattern is correctly matching the messages
4. Test with a simple pattern first, then add complexity
