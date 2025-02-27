# PickleBot

GremlinBot - A bot that responds to mentions of "gremlin" or randomly to Sig

## Overview

PickleBot is a reply bot that monitors chat messages.

## Implementation

PickleBot is implemented using the BotBuilder pattern.

```typescript
// See implementation in src/starbunk/bots/reply-bots/pickleBot.ts
```

## Trigger Condition

PickleBot uses the `GREMLIN` pattern defined in `conditions.ts`.


## Response

When triggered, PickleBot responds with: "Could you repeat that? I don't speak *gremlin*"


## Examples

### When PickleBot Responds

PickleBot will respond to:

| Message | Response |
|---------|----------|
| Example message | Example response |

### When PickleBot Doesn't Respond

PickleBot will not respond to:

| Message | Reason |
|---------|--------|
| Example message | Example reason |
| Messages from other bots | Bot messages are ignored by design |

## Testing

PickleBot has tests in `src/__tests__/starbunk/reply-bots/pickleBot.test.ts` that verify its functionality.
