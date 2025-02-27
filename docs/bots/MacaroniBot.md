# MacaroniBot

MacaroniBot is a reply bot that responds to specific patterns in messages.

## Overview

MacaroniBot is a reply bot that monitors chat messages.

## Implementation

MacaroniBot is implemented using the BotBuilder pattern.

```typescript
// See implementation in src/starbunk/bots/reply-bots/macaroniBot.ts
```

## Trigger Condition

MacaroniBot uses the `MACARONI` pattern defined in `conditions.ts`.




## Examples

### When MacaroniBot Responds

MacaroniBot will respond to:

| Message | Response |
|---------|----------|
| Example message | Example response |

### When MacaroniBot Doesn't Respond

MacaroniBot will not respond to:

| Message | Reason |
|---------|--------|
| Example message | Example reason |
| Messages from other bots | Bot messages are ignored by design |

## Testing

MacaroniBot has tests in `src/__tests__/starbunk/reply-bots/macaroniBot.test.ts` that verify its functionality.
