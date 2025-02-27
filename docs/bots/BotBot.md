# BotBot

BotBot - A bot that responds to messages from other bots

## Overview

BotBot is a reply bot that monitors chat messages.

## Implementation

BotBot is implemented using the BotBuilder pattern.

```typescript
// See implementation in src/starbunk/bots/reply-bots/botBot.ts
```



## Response

When triggered, BotBot responds with: "Hello fellow bot!"


## Examples

### When BotBot Responds

BotBot will respond to:

| Message | Response |
|---------|----------|
| Example message | Example response |

### When BotBot Doesn't Respond

BotBot will not respond to:

| Message | Reason |
|---------|--------|
| Example message | Example reason |
| Messages from other bots | Bot messages are ignored by design |

## Testing

BotBot has tests in `src/__tests__/starbunk/reply-bots/botBot.test.ts` that verify its functionality.
