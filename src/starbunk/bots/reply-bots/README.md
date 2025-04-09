# Strategy-Based Bots

This directory contains bots implemented using the strategy pattern. This approach allows for creating bots with varying levels of complexity while minimizing boilerplate code.

## Core Components

The strategy pattern is implemented through several core components:

- `conditions.ts`: Reusable conditions that can be combined (AND, OR, NOT)
- `responses.ts`: Response generators for creating bot replies
- `trigger-response.ts`: Pairs a condition with a response
- `bot-builder.ts`: Creates bots from collections of trigger-responses
- `llm-conditions.ts`: LLM-based conditions with fallbacks

## Bot Structure

Each bot follows a similar structure:

```
/bot-name/
  index.ts      - Main bot definition using createStrategyBot
  constants.ts  - Static data (optional)
  triggers.ts   - Trigger-response definitions
```

## Simple Bot Example (HoldBot)

For simple bots, you can create them with minimal code:

```typescript
// triggers.ts
export const holdTrigger = createTriggerResponse({
  name: 'hold-trigger',
  condition: matchesPattern(/^Hold\.?$/i),
  response: staticResponse('Hold.')
});

// index.ts
export default createStrategyBot({
  name: 'HoldBot',
  description: 'Responds "Hold." when someone says "Hold"',
  defaultIdentity: {
    botName: 'HoldBot',
    avatarUrl: 'https://i.imgur.com/YPFGEzM.png'
  },
  triggers: [holdTrigger]
});
```

## Complex Bot Example (BlueBot)

For more complex bots, you can add multiple triggers with different priorities:

```typescript
export default createStrategyBot({
  name: 'BlueBot',
  description: 'Responds when someone says "blu?"',
  defaultIdentity: {
    botName: BLUE_BOT_NAME,
    avatarUrl: BLUE_BOT_AVATARS.Default
  },
  triggers: [
    blueMurderTrigger,  // Priority 3
    blueNiceTrigger,    // Priority 4  
    blueConfirmTrigger, // Priority 2
    blueMentionTrigger  // Priority 1
  ]
});
```

## Adding a New Bot

1. Create a new directory under `strategy-bots/`
2. Define your triggers in a `triggers.ts` file
3. Create your bot in `index.ts` using `createStrategyBot`
4. The bot will be automatically loaded by the bot registry

## Using LLM Features

Bots can use LLM capabilities with fallbacks to regex:

```typescript
const smartTrigger = createTriggerResponse({
  name: 'smart-detection',
  condition: createLLMCondition(
    'Does this message mention X?',
    /fallback-regex/i
  ),
  response: staticResponse('I detected X!')
});
```