# SoggyBot

SoggyBot - A bot that responds to wet bread mentions from users with the WetBread role

## Overview

SoggyBot is a reply bot that monitors chat messages.

## Implementation

SoggyBot is implemented using the BotBuilder pattern.

```typescript
// See implementation in src/starbunk/bots/reply-bots/soggyBot.ts
```



## Response

When triggered, SoggyBot responds with: "Sounds like somebody enjoys wet bread"


## Examples

### When SoggyBot Responds

SoggyBot will respond to:

| Message | Response |
|---------|----------|
| Example message | Example response |

### When SoggyBot Doesn't Respond

SoggyBot will not respond to:

| Message | Reason |
|---------|--------|
| Example message | Example reason |
| Messages from other bots | Bot messages are ignored by design |

## Testing

SoggyBot has tests in `src/tests/starbunk/reply-bots/soggyBot.test.ts` that verify its functionality.
