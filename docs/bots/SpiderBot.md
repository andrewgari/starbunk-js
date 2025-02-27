# SpiderBot

SpiderBot is a reply bot that corrects users when they mention "Spiderman" without a hyphen.

## Overview

SpiderBot monitors chat messages for mentions of "Spiderman" (without a hyphen) or "Spider Man" (with a space) and responds with a correction, emphasizing that the proper spelling is "Spider-Man" (with a hyphen).

## Implementation

SpiderBot is implemented using the BotBuilder pattern and uses a pattern condition to detect mentions of Spider-Man in various formats.

```typescript
import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import { PatternCondition, Patterns } from '../conditions';
import ReplyBot from '../replyBot';

export default function createSpiderBot(webhookServiceParam: WebhookService = webhookService): ReplyBot {
	const spiderManCondition = new PatternCondition(Patterns.SPIDER_MAN);

	return new BotBuilder('Spider-Bot', webhookServiceParam)
		.withAvatar('https://i.pinimg.com/736x/33/e0/06/33e00653eb485455ce5121b413b26d3b.jpg')
		.withCustomTrigger(spiderManCondition)
		.respondsWithStatic("Hey, it's \"**Spider-Man**\"! Don't forget the hyphen! Not Spiderman, that's dumb")
		.build();
}
```

## Trigger Condition

SpiderBot uses the `SPIDER_MAN` pattern defined in `conditions.ts`:

```typescript
SPIDER_MAN: /\bspider[-\s]?man\b/i,
```

This pattern matches:
- "spiderman" (no hyphen)
- "spider-man" (with hyphen)
- "spider man" (with space)

The pattern is case-insensitive, so it will match variations like "Spiderman", "SPIDER-MAN", etc.

## Response

When triggered, SpiderBot responds with a static message:

```
Hey, it's "**Spider-Man**"! Don't forget the hyphen! Not Spiderman, that's dumb
```

## Examples

### When SpiderBot Responds

SpiderBot will respond to messages containing variations of "Spider-Man":

| Message | Response |
|---------|----------|
| "I love spiderman!" | "Hey, it's \"**Spider-Man**\"! Don't forget the hyphen! Not Spiderman, that's dumb" |
| "Spider man is my favorite hero." | "Hey, it's \"**Spider-Man**\"! Don't forget the hyphen! Not Spiderman, that's dumb" |
| "Have you seen the new spider-man movie?" | "Hey, it's \"**Spider-Man**\"! Don't forget the hyphen! Not Spiderman, that's dumb" |
| "SPIDERMAN was awesome!" | "Hey, it's \"**Spider-Man**\"! Don't forget the hyphen! Not Spiderman, that's dumb" |

### When SpiderBot Doesn't Respond

SpiderBot will not respond to:

| Message | Reason |
|---------|--------|
| "I like spiders, man." | Not a continuous word "spiderman" |
| "The spider's mansion is huge." | Not matching the pattern |
| "Spider-Woman is cool too." | Different character name |
| Messages from other bots | Bot messages are ignored by design |

## Configuration

- **Name**: Spider-Bot
- **Avatar**: https://i.pinimg.com/736x/33/e0/06/33e00653eb485455ce5121b413b26d3b.jpg
- **Trigger**: Pattern matching for "spider[-\s]?man"
- **Response**: Static message correcting the spelling

## Testing

SpiderBot has comprehensive tests in `src/__tests__/starbunk/reply-bots/spiderBot.test.ts` that verify:

1. The bot's identity (name and avatar URL)
2. The bot's response to various spellings of "Spider-Man"
3. The bot's behavior when ignoring messages from bots
4. The bot's behavior when ignoring unrelated messages
