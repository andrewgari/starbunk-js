# EzioBot

EzioBot is a reply bot that responds to specific patterns in messages.

## Overview

EzioBot is a reply bot that monitors chat messages.

## Implementation

EzioBot is implemented using the BotBuilder pattern.

```typescript
// See implementation in src/starbunk/bots/reply-bots/ezioBot.ts
```

## Trigger Condition

EzioBot uses the `EZIO` pattern defined in `conditions.ts`.




## Examples

### When EzioBot Responds

EzioBot will respond to:

| Message | Response |
|---------|----------|
| Example message | Example response |

### When EzioBot Doesn't Respond

EzioBot will not respond to:

| Message | Reason |
|---------|--------|
| Example message | Example reason |
| Messages from other bots | Bot messages are ignored by design |

## Testing

EzioBot has tests in `src/__tests__/starbunk/reply-bots/ezioBot.test.ts` that verify its functionality.
