# NiceBot

NiceBot is a reply bot that responds to messages containing the number "69" with "Nice."

## Overview

NiceBot monitors chat messages for mentions of the number "69" (or "sixty-nine") and responds with the classic internet meme response "Nice."

## Implementation

NiceBot is implemented using the BotBuilder pattern and uses a pattern condition to detect mentions of "69".

```typescript
import webhookService from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import { PatternCondition, Patterns } from '../conditions';
import ReplyBot from '../replyBot';

export default function createNiceBot(): ReplyBot {
	const niceNumberCondition = new PatternCondition(Patterns.NICE_NUMBER);

	return new BotBuilder('NiceBot', webhookService)
		.withAvatar('https://i.imgur.com/Jd7QDVY.png')
		.withCustomTrigger(niceNumberCondition)
		.respondsWithStatic('Nice.')
		.build();
}
```

## Trigger Condition

NiceBot uses the `NICE_NUMBER` pattern defined in `conditions.ts`:

```typescript
NICE_NUMBER: /\b69|(sixty-?nine)\b/i,
```

This pattern matches:
- The number "69"
- The spelled-out version "sixty-nine" or "sixtynine"

The pattern is case-insensitive and uses word boundaries to ensure it only matches the standalone number/word.

## Response

When triggered, NiceBot responds with a simple static message:

```
Nice.
```

## Examples

### When NiceBot Responds

NiceBot will respond to messages containing "69" or "sixty-nine":

| Message | Response |
|---------|----------|
| "My favorite number is 69" | "Nice." |
| "I scored 69 points!" | "Nice." |
| "It costs sixty-nine dollars" | "Nice." |
| "Room sixtynine is available" | "Nice." |

### When NiceBot Doesn't Respond

NiceBot will not respond to:

| Message | Reason |
|---------|--------|
| "I'm 6'9\" tall" | Not matching the exact pattern (has characters between 6 and 9) |
| "The temperature is 6.9 degrees" | Not matching the exact pattern |
| "I have 690 coins" | Not matching the exact pattern (has additional digit) |
| Messages from other bots | Bot messages are ignored by design |

## Configuration

- **Name**: NiceBot
- **Avatar**: https://i.imgur.com/Jd7QDVY.png
- **Trigger**: Pattern matching for "69" or "sixty-nine"
- **Response**: Static message "Nice."

## Testing

NiceBot has tests in `src/tests/starbunk/reply-bots/niceBot.test.ts` that verify:

1. The bot's identity (name and avatar URL)
2. The bot's response to messages containing "69"
3. The bot's response to messages containing "sixty-nine"
4. The bot's behavior when ignoring messages from bots
5. The bot's behavior when ignoring unrelated messages
