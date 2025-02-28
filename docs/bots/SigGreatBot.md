# SigGreatBot

SigGreatBot - A bot that responds to "Sig best" with "The greatest".

## Overview

SigGreatBot is a reply bot that monitors chat messages.

## Implementation

SigGreatBot is implemented using the BotBuilder pattern.

```typescript
// See implementation in src/starbunk/bots/reply-bots/sigGreatBot.ts
```

## Trigger Condition

SigGreatBot uses the `SIG_GREAT` pattern defined in `conditions.ts`.


## Response

When triggered, SigGreatBot responds with: "The greatest."


## Examples

### When SigGreatBot Responds

SigGreatBot will respond to:

| Message | Response |
|---------|----------|
| Example message | Example response |

### When SigGreatBot Doesn't Respond

SigGreatBot will not respond to:

| Message | Reason |
|---------|--------|
| Example message | Example reason |
| Messages from other bots | Bot messages are ignored by design |

## Testing

SigGreatBot has tests in `src/tests/starbunk/reply-bots/sigGreatBot.test.ts` that verify its functionality.
