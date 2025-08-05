# Reply Bots

Reply bots are simple bots that respond to specific patterns in messages. They are automatically discovered and loaded by the `BotRegistry.discoverBots()` method.

## New Simplified Approach (Recommended)

The new simplified approach makes creating bots extremely easy with minimal code.

### Creating a New Bot

1. Create a new directory in the `reply-bots` directory with your bot's name (e.g., `my-bot`)
2. Create an `index.ts` file in your bot's directory
3. Use the `createBot()` function to define your bot

### Example

```typescript
import { createBot } from '../../createBot';

export default createBot({
  name: 'MyBot',
  description: 'My awesome bot that responds to greetings',
  patterns: [/\bhello\b/i, /\bhi\b/i, /\bhey\b/i],
  responses: ['Hello there!', 'Hi!', 'Hey, how are you?'],
  avatarUrl: 'https://example.com/avatar.png',
  responseRate: 80 // Optional: respond 80% of the time
  // Default message filtering applies automatically
});
```

### Configuration Options

The `createBot()` function accepts the following options:

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `name` | string | Yes | The name of your bot |
| `description` | string | Yes | A description of what your bot does |
| `patterns` | RegExp[] | Yes | Array of regular expressions that trigger your bot |
| `responses` | string[] | Yes | Array of possible responses |
| `avatarUrl` | string | No | URL to the avatar image for your bot |
| `responseRate` | number | No | Percentage chance of responding (0-100) |
| `messageFilter` | function | No | Custom message filtering function (uses default filtering if not provided) |

### Pattern and Response Matching

The `createBot()` function handles different combinations of patterns and responses:

1. **One pattern, one response**: The bot will always respond with the same message
2. **Multiple patterns, one response**: The bot will respond with the same message for any matching pattern
3. **Multiple patterns, multiple responses (equal count)**: Each pattern is matched with the corresponding response
4. **One pattern, multiple responses**: The bot will randomly select one of the responses

## Traditional Approach (Advanced Usage)

For more complex bots, you can still use the traditional approach with the strategy pattern.

### Core Components

The strategy pattern is implemented through several core components:

- `conditions.ts`: Reusable conditions that can be combined (AND, OR, NOT)
- `responses.ts`: Response generators for creating bot replies
- `trigger-response.ts`: Pairs a condition with a response
- `bot-builder.ts`: Creates bots from collections of trigger-responses
- `llm-conditions.ts`: LLM-based conditions with fallbacks

### Complex Bot Example

```typescript
// triggers.ts
export const complexTrigger = createTriggerResponse({
  name: 'complex-trigger',
  condition: and(
    matchesPattern(/pattern/i),
    not(messageFromBot)
  ),
  response: staticResponse('Complex response')
});

// index.ts
export default BotFactory.createBot({
  name: 'ComplexBot',
  description: 'A bot with complex behavior',
  defaultIdentity: {
    botName: 'ComplexBot',
    avatarUrl: 'https://example.com/avatar.png'
  },
  triggers: [
    highPriorityTrigger,  // Priority 3
    mediumPriorityTrigger, // Priority 2
    lowPriorityTrigger     // Priority 1
  ]
});
```

### Using LLM Features

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

See the [bot-factory.ts](../core/bot-factory.ts) and [trigger-response.ts](../core/trigger-response.ts) files for more details on the traditional approach.
