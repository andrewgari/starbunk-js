# HoldBot

HoldBot is a reply bot that responds to specific patterns in messages.

## Overview

HoldBot is a reply bot that monitors chat messages.

## Implementation

HoldBot is implemented using the BotBuilder pattern.

```typescript
// See implementation in src/starbunk/bots/reply-bots/holdBot.ts
```

## Trigger Condition

HoldBot uses the `HOLD` pattern defined in `conditions.ts`.


## Response

When triggered, HoldBot responds with: "Hold."


## Examples

### When HoldBot Responds

HoldBot will respond to:

| Message | Response |
|---------|----------|
| Example message | Example response |

### When HoldBot Doesn't Respond

HoldBot will not respond to:

| Message | Reason |
|---------|--------|
| Example message | Example reason |
| Messages from other bots | Bot messages are ignored by design |

## Testing

HoldBot has tests in `src/__tests__/starbunk/reply-bots/holdBot.test.ts` that verify its functionality.
