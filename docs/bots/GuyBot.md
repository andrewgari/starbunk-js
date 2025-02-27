# GuyBot

GuyBot is a reply bot that responds to messages containing the word "guy" with South Park-inspired responses.

## Overview

GuyBot monitors chat messages for the word "guy" and responds with variations of "I'm not your guy, friend!" in the style of the Canadian characters from South Park.

## Implementation

GuyBot is implemented using the BotBuilder pattern and uses a pattern condition to detect mentions of "guy".

```typescript
import webhookService from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import { PatternCondition, Patterns } from '../conditions';
import ReplyBot from '../replyBot';

const responses = [
	'I\'m not your guy, friend!',
	'I\'m not your guy, buddy!',
	'I\'m not your guy, pal!',
	'I\'m not your guy, chum!',
	'I\'m not your guy, amigo!'
];

export default function createGuyBot(): ReplyBot {
	const guyCondition = new PatternCondition(Patterns.GUY);

	return new BotBuilder('GuyBot', webhookService)
		.withAvatar('https://i.pinimg.com/originals/dc/39/85/dc3985a3ac127397c53bf8c3a749b011.jpg')
		.withCustomTrigger(guyCondition)
		.respondsWithRandom(responses)
		.build();
}
```

## Trigger Condition

GuyBot uses the `GUY` pattern defined in `conditions.ts`:

```typescript
GUY: /\bguy\b/i,
```

This pattern matches the word "guy" with word boundaries, ensuring it only matches the standalone word and not parts of other words.

## Response

When triggered, GuyBot responds with a randomly selected message from its response array:

```typescript
const responses = [
	'I\'m not your guy, friend!',
	'I\'m not your guy, buddy!',
	'I\'m not your guy, pal!',
	'I\'m not your guy, chum!',
	'I\'m not your guy, amigo!'
];
```

## Examples

### When GuyBot Responds

GuyBot will respond to messages containing the word "guy" as a standalone word:

| Message | Response |
|---------|----------|
| "Hey guy, how's it going?" | "I'm not your guy, friend!" (or another random variation) |
| "That guy over there is cool." | "I'm not your guy, buddy!" (or another random variation) |
| "GUY!" | "I'm not your guy, pal!" (or another random variation) |
| "Are you that guy from yesterday?" | "I'm not your guy, chum!" (or another random variation) |

### When GuyBot Doesn't Respond

GuyBot will not respond to:

| Message | Reason |
|---------|--------|
| "Disguise yourself better." | "guy" is part of another word, not a standalone word |
| "The guys are coming over." | "guys" is plural, not matching the exact pattern |
| "Have you seen the guycot?" | "guy" is part of another word |
| Messages from other bots | Bot messages are ignored by design |

## Configuration

- **Name**: GuyBot
- **Avatar**: https://i.pinimg.com/originals/dc/39/85/dc3985a3ac127397c53bf8c3a749b011.jpg
- **Trigger**: Pattern matching for the word "guy"
- **Response**: Random selection from predefined responses

## Testing

GuyBot has tests in `src/__tests__/starbunk/reply-bots/guyBot.test.ts` that verify:

1. The bot's identity (name and avatar URL)
2. The bot's response to messages containing "guy"
3. The bot's behavior when ignoring messages from bots
4. The bot's behavior when ignoring unrelated messages
