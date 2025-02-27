# GundamBot

GundamBot - A bot that responds to mentions of Gundam, mecha, robot, etc.

## Overview

GundamBot is a reply bot that monitors chat messages.

## Implementation

GundamBot is implemented using the BotBuilder pattern.

```typescript
// See implementation in src/starbunk/bots/reply-bots/gundamBot.ts
```

## Trigger Condition

GundamBot uses the `GUNDAM` pattern defined in `conditions.ts`.


## Response

When triggered, GundamBot responds with: "Random response from a predefined list"


## Examples

### When GundamBot Responds

GundamBot will respond to:

| Message | Response |
|---------|----------|
| Example message | Example response |

### When GundamBot Doesn't Respond

GundamBot will not respond to:

| Message | Reason |
|---------|--------|
| Example message | Example reason |
| Messages from other bots | Bot messages are ignored by design |

## Testing

GundamBot has tests in `src/tests/starbunk/reply-bots/gundamBot.test.ts` that verify its functionality.
