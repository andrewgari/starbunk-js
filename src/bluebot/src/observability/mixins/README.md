# BlueBot-Specific LogLayer Mixins

This directory contains BlueBot-specific logging mixins that extend the shared logging mixins with BlueBot's strategy-based architecture.

## Available Mixins

### Strategy Mixin

Adds methods to include BlueBot strategy and trigger context in logs.

**Methods:**

- `withStrategy(strategyName)` - Add strategy name
- `withTrigger(triggerName, triggerType?)` - Add trigger information

**Context Fields:**

- `strategy_name` - Name of the strategy (e.g., "BlueReplyStrategy")
- `trigger_name` - Name of the trigger
- `trigger_type` - Type of trigger (optional)

## Usage

### Setup

The strategy mixin is automatically registered when you call `setupBlueBotLogging()`:

```typescript
import { setupBlueBotLogging } from '@/observability/setup-logging';

// Register all mixins (shared + BlueBot-specific)
setupBlueBotLogging();
```

### Using Strategy Logging

```typescript
import { logger } from '@/observability/logger';

// Log strategy matching
logger
  .withDiscordMessage(message)
  .withStrategy('BlueReplyStrategy')
  .withTrigger('blue_mention', 'keyword')
  .info('Strategy matched');

// Log strategy execution
logger
  .withStrategy('BlueRequestStrategy')
  .startTiming('strategy_execution')
  .info('Executing strategy');

// Later...
logger
  .withStrategy('BlueRequestStrategy')
  .endTiming('strategy_execution')
  .withBotContext({ response_type: 'success' })
  .info('Strategy completed');
```

### Example Output

```json
{
  "level": "info",
  "severity": "INFO",
  "message": "Strategy matched",
  "timestamp": "2026-01-17T12:34:56.789Z",
  "message_id": "1234567890123456789",
  "guild_id": "9876543210987654321",
  "channel_id": "1111222233334444555",
  "user_id": "5555444433332222111",
  "strategy_name": "BlueReplyStrategy",
  "trigger_name": "blue_mention",
  "trigger_type": "keyword"
}
```

## Why BlueBot-Specific?

The strategy/trigger pattern is specific to BlueBot's architecture. Other bots in the Starbunk project may have different patterns:

- **BunkBot** - May have different message handling patterns
- **CovaBot** - May use different routing mechanisms
- **DJCova** - May have music-specific contexts

By keeping strategy logging in BlueBot's domain, we keep the shared package generic and reusable while allowing each bot to extend logging with their own domain-specific concepts.

## Creating Additional BlueBot Mixins

You can add more BlueBot-specific mixins by:

1. Creating a new file in this directory (e.g., `my-mixin.ts`)
2. Following the same pattern as `strategy-mixin.ts`
3. Exporting it from `index.ts`
4. Registering it in `setup-logging.ts`

Example:

```typescript
// my-mixin.ts
import type { LogLayer, LogLayerMixin, LogLayerMixinRegistration } from 'loglayer';
import { LogLayerMixinAugmentType } from 'loglayer';

export interface IMyMixin<T> {
  withMyContext(data: string): T;
}

declare module 'loglayer' {
  interface LogLayer extends IMyMixin<LogLayer> {}
  interface MockLogLayer extends IMyMixin<MockLogLayer> {}
  interface ILogLayer<This> extends IMyMixin<This> {}
}

const myMixinImpl: LogLayerMixin = {
  augmentationType: LogLayerMixinAugmentType.LogLayer,
  augment: (prototype) => {
    prototype.withMyContext = function (this: LogLayer, data: string): LogLayer {
      return this.withContext({ my_data: data });
    };
  },
  augmentMock: (prototype) => {
    prototype.withMyContext = function (this: MockLogLayer, _data: string): MockLogLayer {
      return this;
    };
  },
};

export function myMixin(): LogLayerMixinRegistration {
  return { mixinsToAdd: [myMixinImpl] };
}
```

