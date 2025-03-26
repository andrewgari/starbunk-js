# Bot Migration Guide

This guide explains how to migrate bots from the old config-based pattern to the new strategy pattern.

## Why Migrate?

The new strategy pattern offers several advantages:

- **Reduced Boilerplate**: Less code for simple bots
- **Better Organization**: Domain-coupled files
- **Enhanced Flexibility**: Compose multiple trigger conditions
- **Shared Logic**: Reusable patterns across bots
- **Easier Maintenance**: Simpler to update and extend

## Migration Steps

### Step 1: Create Bot Directory Structure

Under `strategy-bots`, create a directory for your bot:

```
src/starbunk/bots/strategy-bots/your-bot-name/
```

### Step 2: Convert Constants

Create a `constants.ts` file to hold all static data from your config:

```typescript
// constants.ts
export const YOUR_BOT_NAME = 'Your Bot';
export const YOUR_BOT_AVATAR = 'https://example.com/avatar.png';
export const YOUR_BOT_PATTERNS = {
  Default: /your-pattern/i
};
export const YOUR_BOT_RESPONSES = {
  Default: 'Your response'
};
```

### Step 3: Create Triggers

Create a `triggers.ts` file with your trigger-response pairs:

```typescript
// triggers.ts
import { createTriggerResponse } from '../../core/trigger-response';
import { matchesPattern } from '../../core/conditions';
import { staticResponse } from '../../core/responses';
import { YOUR_BOT_PATTERNS, YOUR_BOT_RESPONSES } from './constants';

export const mainTrigger = createTriggerResponse({
  name: 'main-trigger',
  condition: matchesPattern(YOUR_BOT_PATTERNS.Default),
  response: staticResponse(YOUR_BOT_RESPONSES.Default)
});
```

### Step 4: Create Bot Instance

Create an `index.ts` file that exports your bot:

```typescript
// index.ts
import { createStrategyBot } from '../../core/bot-builder';
import { YOUR_BOT_AVATAR, YOUR_BOT_NAME } from './constants';
import { mainTrigger } from './triggers';

export default createStrategyBot({
  name: 'YourBot',
  description: 'Description of your bot',
  defaultIdentity: {
    botName: YOUR_BOT_NAME,
    avatarUrl: YOUR_BOT_AVATAR
  },
  triggers: [mainTrigger]
});
```

## Example Migrations

### Simple Bot (HoldBot)

**Old Approach:**
```typescript
// config/holdBotConfig.ts
export const HoldBotConfig = {
  Name: 'HoldBot',
  Avatars: { Default: 'https://i.imgur.com/YPFGEzM.png' },
  Patterns: { Default: /^Hold\.?$/i },
  Responses: { Default: 'Hold.' }
};

// reply-bots/holdBot.ts
export default class HoldBot extends ReplyBot {
  public get botIdentity(): BotIdentity {
    return {
      botName: HoldBotConfig.Name,
      avatarUrl: HoldBotConfig.Avatars.Default
    };
  }

  protected async processMessage(message: Message): Promise<void> {
    const hasHold = HoldBotConfig.Patterns.Default?.test(message.content);
    if (hasHold) {
      await this.sendReply(message.channel as TextChannel, HoldBotConfig.Responses.Default);
    }
  }
}
```

**New Approach:**
```typescript
// strategy-bots/hold-bot/constants.ts
export const HOLD_BOT_NAME = 'HoldBot';
export const HOLD_AVATAR_URL = 'https://i.imgur.com/YPFGEzM.png';
export const HOLD_PATTERN = /^Hold\.?$/i;
export const HOLD_RESPONSE = 'Hold.';

// strategy-bots/hold-bot/triggers.ts
export const holdTrigger = createTriggerResponse({
  name: 'hold-trigger',
  condition: matchesPattern(HOLD_PATTERN),
  response: staticResponse(HOLD_RESPONSE)
});

// strategy-bots/hold-bot/index.ts
export default createStrategyBot({
  name: 'HoldBot',
  description: 'Responds "Hold." when someone says "Hold"',
  defaultIdentity: {
    botName: HOLD_BOT_NAME,
    avatarUrl: HOLD_AVATAR_URL
  },
  triggers: [holdTrigger]
});
```

### Complex Bot with Multiple Triggers

For more complex bots like BlueBot, see the example in the `strategy-bots/blue-bot` directory, which demonstrates:

- Multiple trigger conditions
- State tracking between triggers
- Dynamic identity switching
- Advanced response generation
- Conditional triggers with timeframes

## Available Utilities

The core module provides many reusable components:

### Conditions
- `matchesPattern(regex)` - Match a regex pattern
- `fromUser(userId)` - From a specific user
- `withChance(percentage)` - Random chance to trigger
- `withinTimeframeOf(timestampFn, duration, unit)` - Within a time period

### Combining Conditions
- `and(condition1, condition2, ...)` - All conditions must be true
- `or(condition1, condition2, ...)` - Any condition must be true
- `not(condition)` - Negates a condition

### Response Generators
- `staticResponse(text)` - Always returns the same text
- `randomResponse(options)` - Picks randomly from array
- `regexCaptureResponse(pattern, template)` - Uses regex captures

### LLM Integration
- `createLLMCondition(prompt, fallbackRegex)` - Uses LLM with fallback

## Need Help?

See the `strategy-bots/README.md` file for more examples and usage details.

## Voice Bot Migration

### Why Migrate Voice Bots?

The new voice bot strategy pattern offers several advantages:

- **Composable Triggers**: Mix and match voice event conditions
- **Cleaner Code**: Less boilerplate, more focused logic
- **Better Testing**: Easier to test individual triggers
- **Shared Logic**: Reuse common voice event conditions
- **Consistent Pattern**: Aligns with strategy bot pattern

### Step 1: Create Bot Directory Structure

Under `voice-bots`, create a directory for your bot:

```
src/starbunk/bots/voice-bots/your-bot-name/
```

### Step 2: Convert Constants

Create a `constants.ts` file to hold all static data:

```typescript
// constants.ts
export const YOUR_BOT_NAME = 'Your Bot';
export const YOUR_BOT_AVATAR = 'https://example.com/avatar.png';
```

### Step 3: Create Triggers

Create a `triggers.ts` file with your voice event triggers:

```typescript
// triggers.ts
import { createVoiceTrigger } from '../../core/voice-bot-builder';
import { userJoinedVoiceChannel } from '../../core/voice-conditions';

export const joinTrigger = createVoiceTrigger({
  name: 'join-trigger',
  condition: userJoinedVoiceChannel(),
  handler: async (oldState, newState) => {
    // Handle voice state change
  }
});
```

### Step 4: Create Bot Instance

Create an `index.ts` file that exports your bot:

```typescript
// index.ts
import { createVoiceBot } from '../../core/voice-bot-builder';
import { YOUR_BOT_AVATAR, YOUR_BOT_NAME } from './constants';
import { joinTrigger } from './triggers';

export default createVoiceBot({
  name: 'YourBot',
  description: 'Description of your bot',
  defaultIdentity: {
    botName: YOUR_BOT_NAME,
    avatarUrl: YOUR_BOT_AVATAR
  },
  triggers: [joinTrigger]
});
```

## Example Voice Bot Migration

### Simple Voice Bot (GuyChannelBot)

**Old Approach:**
```typescript
// voice-bots/guyChannelBot.ts
export default class GuyChannelBot extends VoiceBot {
  public readonly botName = 'Guy Channel Bot';

  handleEvent(oldState: VoiceState, newState: VoiceState): void {
    const member = oldState.member;
    const newChannelId = newState.channelId;

    if (member?.id === userId.Guy && newChannelId === channelId.NoGuyLounge) {
      this.moveToRandomVoiceChannel(member);
    }
  }
}
```

**New Approach:**
```typescript
// voice-bots/guy-channel-bot/constants.ts
export const GUY_BOT_NAME = 'Guy Channel Bot';
export const GUY_BOT_AVATAR = 'https://example.com/guy.png';

// voice-bots/guy-channel-bot/triggers.ts
export const guyChannelTrigger = createVoiceTrigger({
  name: 'guy-channel-trigger',
  condition: and(
    userJoinedVoiceChannel(),
    isUser(userId.Guy),
    isChannel(channelId.NoGuyLounge)
  ),
  handler: async (oldState, newState) => {
    await moveToRandomVoiceChannel(newState.member);
  }
});

// voice-bots/guy-channel-bot/index.ts
export default createVoiceBot({
  name: 'GuyChannelBot',
  description: 'Enforces Guy channel access rules',
  defaultIdentity: {
    botName: GUY_BOT_NAME,
    avatarUrl: GUY_BOT_AVATAR
  },
  triggers: [guyChannelTrigger]
});
```

## Available Voice Utilities

The core module provides reusable components for voice bots:

### Voice Conditions
- `userJoinedVoiceChannel()` - User joined a voice channel
- `userLeftVoiceChannel()` - User left a voice channel
- `userMovedChannel()` - User moved between channels
- `isUser(userId)` - Match specific user
- `isChannel(channelId)` - Match specific channel
- `hasPermission(permission)` - Check user permissions

### Combining Conditions
- `and(condition1, condition2, ...)` - All conditions must be true
- `or(condition1, condition2, ...)` - Any condition must be true
- `not(condition)` - Negates a condition

### Voice Actions
- `moveToChannel(channelId)` - Move user to specific channel
- `moveToRandomVoiceChannel()` - Move user to random channel
- `disconnectUser()` - Disconnect user from voice
- `setUserVolume(volume)` - Adjust user volume

## Need Help?

See the `voice-bots/README.md` file for more examples and usage details.
