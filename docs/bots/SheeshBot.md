# SheeshBot

SheeshBot - A bot that responds to "sheesh" with a sheesh of random length

## Overview

SheeshBot is a reply bot that monitors chat messages.

## Implementation

SheeshBot is implemented using the BotBuilder pattern.

```typescript
// See implementation in src/starbunk/bots/reply-bots/sheeshBot.ts
```

## Trigger Condition

SheeshBot uses the `SHEESH` pattern defined in `conditions.ts`.




## Examples

### When SheeshBot Responds

SheeshBot will respond to:

| Message | Response |
|---------|----------|
| Example message | Example response |

### When SheeshBot Doesn't Respond

SheeshBot will not respond to:

| Message | Reason |
|---------|--------|
| Example message | Example reason |
| Messages from other bots | Bot messages are ignored by design |

## Testing

SheeshBot has tests in `src/__tests__/starbunk/reply-bots/sheeshBot.test.ts` that verify its functionality.
