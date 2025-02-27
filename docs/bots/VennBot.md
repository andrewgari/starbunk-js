# VennBot

VennBot - A bot that responds to mentions of Venn or randomly to Venn's messages

## Overview

VennBot is a reply bot that monitors chat messages.

## Implementation

VennBot is implemented using the BotBuilder pattern.

```typescript
// See implementation in src/starbunk/bots/reply-bots/vennBot.ts
```

## Trigger Condition

VennBot uses the `VENN_MENTION` pattern defined in `conditions.ts`.


## Response

When triggered, VennBot responds with: "Random response from a predefined list"


## Examples

### When VennBot Responds

VennBot will respond to:

| Message | Response |
|---------|----------|
| Example message | Example response |

### When VennBot Doesn't Respond

VennBot will not respond to:

| Message | Reason |
|---------|--------|
| Example message | Example reason |
| Messages from other bots | Bot messages are ignored by design |

## Testing

VennBot has tests in `src/tests/starbunk/reply-bots/vennBot.test.ts` that verify its functionality.
