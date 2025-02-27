# BananaBot

BananaBot is a reply bot that responds to messages containing "banana" or randomly to a user named "Venn".

## Overview

BananaBot monitors chat messages for mentions of "banana" and responds with banana-related facts and jokes. It also has a special behavior where it will occasionally respond to messages from a user named "Venn" even if they don't mention bananas.

## Implementation

BananaBot is implemented using the BotBuilder pattern with multiple trigger conditions.

```typescript
import { Message } from 'discord.js';
import Random from '../../../utils/random';
import webhookService from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import { PatternCondition, Patterns } from '../conditions';
import { isVenn } from '../triggers/userConditions';
import ReplyBot from '../replyBot';

const responses = [
	"Did you know that bananas are berries, but strawberries aren't?",
	'Bananas are slightly radioactive due to their potassium content!',
	'A cluster of bananas is called a "hand" and a single banana is called a "finger"!',
	'Bananas float in water because they are less dense than water.',
	'Bananas grow on plants that are actually giant herbs, not trees!',
	'Bananas are curved because they grow towards the sun!',
	'The scientific name for banana is "musa sapientum", which means "fruit of the wise men".',
	'Bananas contain tryptophan, which helps the body produce serotonin!',
	'Bananas are 75% water.',
	'Bananas are the most popular fruit in the US!',
	"Bananas don't grow on trees. They grow on plants that are actually giant herbs!",
	'Bananas are naturally slightly radioactive!',
	'Bananas are actually berries!',
	'Bananas are curved because they grow towards the sun!',
	'Bananas are the only fruit that contains the amino acid tryptophan and vitamin B6 that together help the body produce serotonin.',
	'Bananas are one of the only fruits that ripen better off the plant than on it.',
	'Bananas are the most widely consumed fruit in the world.',
	'Bananas are mentioned in ancient Buddhist texts from around 600 BC.',
	'Bananas are the fruit with the highest sales volume in the United States.',
	'Bananas are the most exported fresh fruit in the world.',
];

// Custom trigger that responds to Venn 10% of the time
class VennRandomTrigger implements TriggerCondition {
	async shouldTrigger(message: Message): Promise<boolean> {
		return isVenn(message) && Random.chance(0.1);
	}
}

export default function createBananaBot(): ReplyBot {
	const bananaCondition = new PatternCondition(Patterns.BANANA);
	const vennRandomTrigger = new VennRandomTrigger();

	return new BotBuilder('BananaBot', webhookService)
		.withAvatar('https://i.imgur.com/Yx2cHyJ.png')
		.withCustomTrigger(bananaCondition)
		.respondsWithRandom(responses)
		.withCustomTrigger(vennRandomTrigger)
		.respondsWithRandom(responses)
		.build();
}
```

## Trigger Conditions

BananaBot requires one of two trigger conditions:

1. The `BANANA` pattern defined in `conditions.ts`:

    ```typescript
    BANANA: /banana/i,
    ```

2. A custom `VennRandomTrigger` that has a 10% chance of triggering when a user named "Venn" sends any message.

## Response

When triggered, BananaBot responds with a randomly selected banana fact from its response array. Here are some examples:

- "Did you know that bananas are berries, but strawberries aren't?"
- "Bananas are slightly radioactive due to their potassium content!"
- "A cluster of bananas is called a 'hand' and a single banana is called a 'finger'!"
- "Bananas float in water because they are less dense than water."
- "Bananas grow on plants that are actually giant herbs, not trees!"

## Examples

### When BananaBot Responds

BananaBot will respond to:

| Message                      | Response                        | Reason                   |
| ---------------------------- | ------------------------------- | ------------------------ |
| "I love bananas!"            | Random banana fact              | Contains "banana"        |
| "Banana bread is delicious." | Random banana fact              | Contains "banana"        |
| "BANANA!"                    | Random banana fact              | Contains "banana"        |
| Any message from user "Venn" | Random banana fact (10% chance) | Special trigger for Venn |

### When BananaBot Doesn't Respond

BananaBot will not respond to:

| Message                                     | Reason                             |
| ------------------------------------------- | ---------------------------------- |
| "I like fruit."                             | Doesn't contain "banana"           |
| "Let's talk about apples."                  | Doesn't contain "banana"           |
| Messages from user "Venn" (90% of the time) | Random chance doesn't trigger      |
| Messages from other bots                    | Bot messages are ignored by design |

## Configuration

- **Name**: BananaBot
- **Avatar**: https://i.imgur.com/Yx2cHyJ.png
- **Triggers**:
    - Pattern matching for "banana"
    - 10% chance for messages from user "Venn"
- **Response**: Random selection from banana facts

## Testing

BananaBot has tests in `src/__tests__/starbunk/reply-bots/bananaBot.test.ts` that verify:

1. The bot's identity (name and avatar URL)
2. The bot's response to messages containing "banana"
3. The bot's special behavior with messages from "Venn"
4. The bot's behavior when ignoring messages from bots
5. The bot's behavior when ignoring unrelated messages
