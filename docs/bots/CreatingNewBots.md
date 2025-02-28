# Creating New Bots

This guide explains how to create new bots for the Starbunk Discord bot system.

## Overview

Starbunk supports two types of bots:
1. **Reply Bots** - Respond to text messages
2. **Voice Bots** - Respond to voice channel events

Most bots can be created using the `BotBuilder` class, which provides a fluent API for configuring bot behavior.

## Creating a Simple Reply Bot

Here's how to create a simple reply bot that responds to a specific pattern:

### 1. Create a new file in `src/starbunk/bots/reply-bots/`

Create a new file named after your bot, e.g., `myBot.ts`.

### 2. Implement the bot using BotBuilder

```typescript
import webhookService from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import { PatternCondition } from '../conditions';
import ReplyBot from '../replyBot';

/**
 * MyBot - A bot that responds to messages containing "hello"
 */
export default function createMyBot(): ReplyBot {
  // Define a pattern to match
  const helloPattern = /\bhello\b/i;
  const helloCondition = new PatternCondition(helloPattern);

  // Build the bot
  return new BotBuilder('MyBot', webhookService)
    .withAvatar('https://example.com/my-bot-avatar.png')
    .withCustomTrigger(helloCondition)
    .respondsWithStatic('Hello there!')
    .build();
}
```

### 3. Register the bot in the client

Open `src/starbunk/starbunkClient.ts` and add your bot to the list:

```typescript
import createMyBot from './bots/reply-bots/myBot';

// In the constructor
this.replyBots = [
  // ... existing bots
  createMyBot(),
];
```

### 4. Create tests for your bot

Create a test file in `src/tests/starbunk/reply-bots/myBot.test.ts`:

```typescript
import { Message, TextChannel, User } from 'discord.js';
import { patchReplyBot } from '../../../__tests__/helpers/replyBotHelper';
import { createMockMessage } from '../../../__tests__/mocks/discordMocks';
import { createMockWebhookService } from '../../../__tests__/mocks/serviceMocks';
import createMyBot from '../../../starbunk/bots/reply-bots/myBot';
import ReplyBot from '../../../starbunk/bots/replyBot';

describe('MyBot', () => {
  let myBot: ReplyBot;
  let mockMessage: Partial<Message<boolean>>;
  let mockWebhookService: ReturnType<typeof createMockWebhookService>;

  beforeEach(() => {
    mockWebhookService = createMockWebhookService();
    mockMessage = createMockMessage();
    myBot = createMyBot();

    // Patch the sendReply method for synchronous testing
    patchReplyBot(myBot, mockWebhookService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('bot configuration', () => {
    it('should have correct name', () => {
      expect(myBot.getIdentity().name).toBe('MyBot');
    });

    it('should have correct avatar URL', () => {
      expect(myBot.getIdentity().avatarUrl).toBe('https://example.com/my-bot-avatar.png');
    });
  });

  describe('message handling', () => {
    it('should respond to "hello"', async () => {
      mockMessage.content = 'hello there';
      await myBot.handleMessage(mockMessage as Message<boolean>);
      expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
        mockMessage.channel as TextChannel,
        expect.objectContaining({
          content: 'Hello there!'
        })
      );
    });

    it('should not respond to unrelated messages', async () => {
      mockMessage.content = 'goodbye';
      await myBot.handleMessage(mockMessage as Message<boolean>);
      expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
    });
  });
});
```

## Advanced Bot Features

### Using Random Responses

To make your bot respond with random messages:

```typescript
const responses = [
  'Hello there!',
  'Hi!',
  'Greetings!',
  'Hey, how are you?'
];

return new BotBuilder('MyBot', webhookService)
  .withAvatar('https://example.com/my-bot-avatar.png')
  .withCustomTrigger(helloCondition)
  .respondsWithRandom(responses)
  .build();
```

### Using Multiple Triggers

You can add multiple triggers with different responses:

```typescript
return new BotBuilder('MyBot', webhookService)
  .withAvatar('https://example.com/my-bot-avatar.png')
  .withCustomTrigger(helloCondition)
  .respondsWithStatic('Hello there!')
  .withCustomTrigger(goodbyeCondition)
  .respondsWithStatic('Goodbye!')
  .build();
```

### Creating Custom Trigger Conditions

You can create custom trigger conditions by implementing the `TriggerCondition` interface:

```typescript
import { Message } from 'discord.js';
import { TriggerCondition } from '../botTypes';

class CustomTrigger implements TriggerCondition {
  async shouldTrigger(message: Message): Promise<boolean> {
    // Your custom logic here
    return message.content.length > 10 && message.content.includes('keyword');
  }
}
```

### Creating a Voice Bot

Voice bots respond to voice channel events:

```typescript
import { VoiceState } from 'discord.js';
import VoiceBot from '../voiceBot';

export default function createMyVoiceBot(): VoiceBot {
  return {
    handleVoiceStateUpdate: async (oldState: VoiceState, newState: VoiceState) => {
      // Your voice channel logic here
      if (oldState.channelId !== newState.channelId) {
        console.log(`User ${newState.member?.user.username} changed voice channels`);
      }
    }
  };
}
```

Register it in the client:

```typescript
// In starbunkClient.ts
this.voiceBots = [
  // ... existing voice bots
  createMyVoiceBot(),
];
```

## Best Practices

1. **Keep bots simple** - Each bot should have a single responsibility
2. **Use descriptive names** - Name your bot based on what it does
3. **Add comprehensive tests** - Test all aspects of your bot's behavior
4. **Document your bot** - Add a README file in the `docs/bots/` directory
5. **Use existing patterns** - Look at existing bots for inspiration
6. **Handle edge cases** - Make sure your bot handles all possible inputs
7. **Avoid overlapping triggers** - Be careful not to create bots that conflict with each other
