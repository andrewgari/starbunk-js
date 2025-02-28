# ChaosBot

ChaosBot - A simple bot that responds to "chaos" with a fixed message

## Overview

ChaosBot is a reply bot that monitors chat messages.

## Implementation

ChaosBot is implemented using the BotBuilder pattern.

```typescript
// See implementation in src/starbunk/bots/reply-bots/chaosBot.ts
```

## Trigger Condition

ChaosBot uses the `CHAOS` pattern defined in `conditions.ts`.


## Response

When triggered, ChaosBot responds with: "All I know is...I'm here to kill Chaos"


## Examples

### When ChaosBot Responds

ChaosBot will respond to:

| Message | Response |
|---------|----------|
| Example message | Example response |

### When ChaosBot Doesn't Respond

ChaosBot will not respond to:

| Message | Reason |
|---------|--------|
| Example message | Example reason |
| Messages from other bots | Bot messages are ignored by design |

## Testing

ChaosBot has tests in `src/tests/starbunk/reply-bots/chaosBot.test.ts` that verify its functionality.
