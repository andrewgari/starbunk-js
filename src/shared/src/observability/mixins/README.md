# LogLayer Mixins for Starbunk

This directory contains reusable logging mixins that extend LogLayer with domain-specific functionality for Discord bots.

## Available Mixins

### Discord Context Mixin
Adds methods to include Discord message context in logs.

**Methods:**
- `withDiscordMessage(message)` - Automatically extracts and adds message context
- `withDiscordContext(context)` - Manually add Discord context fields

**Context Fields:**
- `message_id` - Discord message ID
- `guild_id` - Discord guild (server) ID
- `channel_id` - Discord channel ID
- `user_id` - Discord user ID
- `username` - Discord username
- `content_length` - Length of message content
- `has_attachments` - Whether message has attachments
- `has_embeds` - Whether message has embeds

### Performance Mixin
Adds methods to track operation timing and performance.

**Methods:**
- `startTiming(operationName)` - Start tracking an operation
- `endTiming(operationName)` - End tracking and log duration
- `withDuration(operationName, durationMs)` - Log with a specific duration

**Context Fields:**
- `operation` - Name of the operation
- `duration_ms` - Duration in milliseconds

### Bot Context Mixin
Adds methods to include generic bot context in logs.

**Methods:**
- `withBotContext(context)` - Add bot context object

**Context Fields:**
- `bot_name` - Name of the bot
- `response_type` - Response type (success/error/skipped)
- Any additional bot-specific fields can be added via the context object

## Usage

### Setup (Required)
Mixins must be registered **before** creating any LogLayer instances:

```typescript
import { useLogLayerMixin } from 'loglayer';
import {
  discordContextMixin,
  performanceMixin,
  botContextMixin
} from '@starbunk/shared/observability/mixins';

// Register mixins before creating loggers
useLogLayerMixin([
  discordContextMixin(),
  performanceMixin(),
  botContextMixin(),
]);

// Or use the convenience function
import { registerStarbunkMixins } from '@starbunk/shared/observability/mixins';
registerStarbunkMixins();
```

### Basic Usage

```typescript
import { logLayer } from '@starbunk/shared/observability/log-layer';

const logger = logLayer.withPrefix('MyBot');

// Discord context
logger
  .withDiscordMessage(message)
  .info('Processing message');
// Logs: { message_id: '123', guild_id: '456', channel_id: '789', ... }

// Performance tracking
logger.startTiming('message_processing');
// ... do work ...
logger
  .endTiming('message_processing')
  .info('Message processed');
// Logs: { operation: 'message_processing', duration_ms: 150, ... }

// Bot context
logger
  .withBotContext({
    bot_name: 'MyBot',
    response_type: 'success',
  })
  .info('Bot action completed');
// Logs: { bot_name: 'MyBot', response_type: 'success', ... }
```

### Composing Mixins

All mixins can be chained together:

```typescript
const startTime = Date.now();

logger
  .withDiscordMessage(message)
  .withBotContext({ bot_name: 'MyBot' })
  .startTiming('response_generation')
  .info('Generating response');

// ... generate response ...

logger
  .withDiscordMessage(message)
  .endTiming('response_generation')
  .withBotContext({ response_type: 'success' })
  .info('Response sent');
```

### Error Logging with Context

```typescript
try {
  await processMessage(message);
} catch (error) {
  logger
    .withDiscordMessage(message)
    .withBotContext({ bot_name: 'MyBot' })
    .withError(error)
    .error('Failed to process message');
}
```

## TypeScript Support

All mixins include full TypeScript type definitions. The mixin methods are automatically available on:
- `LogLayer` instances
- `ILogLayer<T>` interface (for dependency injection)
- `MockLogLayer` (for testing)

```typescript
import type { ILogLayer } from 'loglayer';

class MyService {
  constructor(private logger: ILogLayer) {}

  async processMessage(message: Message) {
    // Mixin methods are fully typed
    this.logger
      .withDiscordMessage(message)
      .startTiming('processing')
      .info('Processing started');
  }
}
```

## Creating Custom Mixins

See the [LogLayer mixin documentation](https://loglayer.dev/mixins/creating-mixins) for details on creating your own mixins.

Each bot can add its own specific mixins in their own codebase while using these shared ones as a foundation.

