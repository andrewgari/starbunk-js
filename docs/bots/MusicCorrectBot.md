# MusicCorrectBot

MusicCorrectBot is a reply bot that responds to specific patterns in messages.

## Overview

MusicCorrectBot is a reply bot that monitors chat messages.

## Implementation

MusicCorrectBot is implemented using the BotBuilder pattern.

```typescript
// See implementation in src/starbunk/bots/reply-bots/musicCorrectBot.ts
```

## Trigger Condition

MusicCorrectBot uses the `MUSIC_COMMAND` pattern defined in `conditions.ts`.


## Response

When triggered, MusicCorrectBot responds with: a predefined message


## Examples

### When MusicCorrectBot Responds

MusicCorrectBot will respond to:

| Message | Response |
|---------|----------|
| Example message | Example response |

### When MusicCorrectBot Doesn't Respond

MusicCorrectBot will not respond to:

| Message | Reason |
|---------|--------|
| Example message | Example reason |
| Messages from other bots | Bot messages are ignored by design |

## Testing

MusicCorrectBot has tests in `src/__tests__/starbunk/reply-bots/musicCorrectBot.test.ts` that verify its functionality.
