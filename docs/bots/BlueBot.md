# BlueBot

BlueBot is a complex reply bot that responds to mentions of "blue" with various behaviors, including AI-powered responses.

## Overview

BlueBot monitors chat messages for mentions of "blue" and has several different response modes:
- Basic mentions of "blue"
- Acknowledgment of previous mentions
- Responses to mean messages about blue
- Special responses to mentions from a user named "Venn"
- AI-powered responses to requests for nice messages

## Implementation

BlueBot is implemented using the BotBuilder pattern with multiple trigger conditions and response types. It can also use OpenAI for AI-powered responses if an API key is available.

```typescript
export default function createBlueBot(config: BluBotConfig = {}): ReplyBot {
	const {
		webhookService: webhookServiceParam = webhookService,
		openAIClient = createOpenAIClient(),
		useAIDetection = !!openAIClient
	} = config;

	// Create the bot with dynamic identity
	const builder = new BotBuilder('BluBot', webhookServiceParam)
		.withAvatar(DEFAULT_AVATAR)
		.withDynamicIdentity(createBluBotIdentityUpdater());

	// Add the nice message response handler
	if (openAIClient) {
		builder.withConditionResponseHandler(
			new NiceMessageResponse(openAIClient)
		);
	}

	// Add the various triggers and responses
	return builder
		.withCustomTrigger(new BlueAcknowledgmentCondition())
		.respondsWithStatic(RESPONSES.ACKNOWLEDGMENT)
		.withCustomTrigger(new VennCondition())
		.respondsWithStatic(RESPONSES.VENN_INSULT)
		.withCustomTrigger(new AllConditionsTrigger([
			new PatternCondition(Patterns.BLUE),
			new PatternCondition(Patterns.MEAN)
		]))
		.respondsWithStatic(RESPONSES.NAVY_SEAL)
		.withCustomTrigger(new PatternCondition(Patterns.BLUE))
		.respondsWithStatic(RESPONSES.BASIC_MENTION)
		.build();
}
```

## Trigger Conditions

BlueBot uses several patterns and custom conditions:

```typescript
// Basic blue pattern
BLUE: /\b(blu|blue)\b/i,

// Mean messages pattern
MEAN: /\b(fuck(ing)?|hate|die|kill|worst|mom|shit|murder|bots?)\b/i,

// Request for nice messages
BLUE_REQUEST: /blue?bot,? say something nice about/i,

// Acknowledgment of previous mentions
BLUE_ACKNOWLEDGMENT: /\\b(blue?(bot)?)|(bot)|yes|no|yep|yeah|(i did)|(you got it)|(sure did)\b\b/i,
```

## Responses

BlueBot has several different responses depending on the trigger:

1. **Basic Mention**: "Did somebody say Blu?"
2. **Acknowledgment**: "Lol, Somebody definitely said Blu! :smile:"
3. **Mean Messages**: A long "Navy Seal" copypasta parody
4. **Venn Mentions**: "No way, Venn can suck my blu cane. :unamused:"
5. **Nice Message Requests**: AI-generated compliments (if OpenAI API is available)

## Examples

### When BlueBot Responds

BlueBot will respond to various mentions of "blue":

| Message | Response |
|---------|----------|
| "I like the color blue" | "Did somebody say Blu?" |
| "BluBot, are you there?" | "Did somebody say Blu?" |
| "I hate blue, it's the worst color" | Navy Seal copypasta parody |
| "BluBot, say something nice about cats" | AI-generated compliment about cats (if OpenAI available) |
| "Yes" (after BlueBot has recently responded) | "Lol, Somebody definitely said Blu! :smile:" |

### When BlueBot Doesn't Respond

BlueBot will not respond to:

| Message | Reason |
|---------|--------|
| "The sky is bluish today" | "blue" is part of another word |
| "I'm feeling sad" | No mention of "blue" |
| Messages from other bots | Bot messages are ignored by design |
| Messages from itself | Self-messages are ignored |

## Special Features

### Dynamic Identity

BlueBot can change its avatar based on context:
- Default: https://imgur.com/WcBRCWn.png
- Cheeky: https://i.imgur.com/dO4a59n.png
- Murder: https://imgur.com/Tpo8Ywd.jpg

### AI-Powered Responses

If an OpenAI API key is available, BlueBot can generate custom compliments about topics.

## Configuration

- **Name**: BluBot
- **Default Avatar**: https://imgur.com/WcBRCWn.png
- **Triggers**: Multiple pattern conditions
- **Responses**: Mix of static and AI-generated responses

## Testing

BlueBot has comprehensive tests in `src/__tests__/starbunk/reply-bots/blueBot.test.ts` that verify:

1. The bot's identity (name and avatar URL)
2. The bot's responses to various triggers
3. The bot's behavior when ignoring messages from bots
4. The bot's AI-powered responses
