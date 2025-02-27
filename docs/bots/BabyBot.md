# BabyBot

BabyBot is a reply bot that responds to specific patterns in messages.

## Overview

BabyBot is a reply bot that monitors chat messages.

## Implementation

BabyBot is implemented using the BotBuilder pattern.

```typescript
// See implementation in src/starbunk/bots/reply-bots/babyBot.ts
```

## Trigger Condition

BabyBot uses the `BABY` pattern defined in `conditions.ts`.


## Response

When triggered, BabyBot responds with: a predefined message


## Examples

### When BabyBot Responds

BabyBot will respond to:

| Message | Response |
|---------|----------|
| Example message | Example response |

### When BabyBot Doesn't Respond

BabyBot will not respond to:

| Message | Reason |
|---------|--------|
| Example message | Example reason |
| Messages from other bots | Bot messages are ignored by design |

## Testing

BabyBot has tests in `src/tests/starbunk/reply-bots/babyBot.test.ts` that verify its functionality.
