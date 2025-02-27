# CheckBot

CheckBot is a reply bot that responds to specific patterns in messages.

## Overview

CheckBot is a reply bot that monitors chat messages.

## Implementation

CheckBot is implemented using the BotBuilder pattern.

## Trigger Condition

CheckBot uses the `CZECH` pattern defined in `conditions.ts`.

## Response

It says "I believe you mean '${ // repeat the original message but replace czech with check}

## Trigger Condition

CheckBot uses the `CHECK` pattern defined in `conditions.ts`.

## Response

It says "I believe you mean '${ // repeat the original message but replace check with czech}

## Examples

### When CheckBot Responds

CheckBot will respond to:

| Message         | Response         |
| --------------- | ---------------- |
| Example message | Example response |

### When CheckBot Doesn't Respond

CheckBot will not respond to:

| Message                  | Reason                             |
| ------------------------ | ---------------------------------- |
| Example message          | Example reason                     |
| Messages from other bots | Bot messages are ignored by design |

## Testing

CheckBot has tests in `src/__tests__/starbunk/reply-bots/checkBot.test.ts` that verify its functionality.
