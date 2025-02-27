# CheckBot

CheckBot is a reply bot that responds to specific patterns in messages.

## Overview

CheckBot is a reply bot that monitors chat messages.

## Implementation

CheckBot is implemented using the BotBuilder pattern.

```typescript
// See implementation in src/starbunk/bots/reply-bots/checkBot.ts
```

## Trigger Condition

CheckBot uses the `CZECH` pattern defined in `conditions.ts`.




## Examples

### When CheckBot Responds

CheckBot will respond to:

| Message | Response |
|---------|----------|
| Example message | Example response |

### When CheckBot Doesn't Respond

CheckBot will not respond to:

| Message | Reason |
|---------|--------|
| Example message | Example reason |
| Messages from other bots | Bot messages are ignored by design |

## Testing

CheckBot has tests in `src/__tests__/starbunk/reply-bots/checkBot.test.ts` that verify its functionality.
