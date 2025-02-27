# 🤖 BunkBot Discord Bot

A powerful Discord bot designed for seamless cross-server communication and community management.

## ✨ Features

- 🔄 **Cross-Server Sync**: Bridge channels between Snowbunk and StarBunk communities
- 🎮 **Smart Message Relay**: Intelligent webhook system for natural communication flow
- 🎵 **Media Support**: High-quality audio playback with ffmpeg integration
- 🐳 **Modern Deployment**: Containerized with Docker for reliable hosting
- 🔒 **Secure Design**: Runs with non-root user in production
- 🧩 **Class-Based Bot Architecture**: Modular and extensible bot system using class inheritance

## 🚀 Getting Started

### Prerequisites

- Node.js 20 or higher
- Docker (optional for containerized deployment)
- Discord Bot Token
- Server Admin permissions

### 🛠️ Development Setup

1. Clone the repository:

    ```bash
    git clone https://github.com/yourusername/bunkbot.git
    cd bunkbot
    ```

2. Create `.env` file with required configuration:

    ```env
    # Discord Bot Tokens
    STARBUNK_TOKEN=your_starbunk_bot_token
    SNOWBUNK_TOKEN=your_snowbunk_bot_token

    # Environment
    NODE_ENV=development

    # Optional: Debug Logging
    DEBUG=false
    ```

    You'll need to:

    1. Create a Discord application in the [Discord Developer Portal](https://discord.com/developers/applications)
    2. Create a bot for each server (StarBunk and SnowBunk)
    3. Generate tokens for each bot
    4. Add the tokens to your `.env` file

    ⚠️ Never commit your `.env` file or share your bot tokens

3. Install dependencies:

    ```bash
    npm install
    ```

4. Start development server:
    ```bash
    npm run dev
    ```

## �� Bot Architecture

BunkBot includes two main types of bots:

1. **Reply Bots** - Respond to text messages with specific patterns
2. **Voice Bots** - Respond to voice channel events

Most bots are created using the `BotBuilder` class, which provides a fluent API for configuring bot behavior:

```typescript
import webhookService from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import { PatternCondition, Patterns } from '../conditions';
import ReplyBot from '../replyBot';

export default function createMyBot(): ReplyBot {
  const myCondition = new PatternCondition(Patterns.MY_PATTERN);

  return new BotBuilder('MyBot', webhookService)
    .withAvatar('https://example.com/avatar.png')
    .withCustomTrigger(myCondition)
    .respondsWithStatic('Hello there!')
    .build();
}
```

## 📚 Documentation

- [Bot Documentation](./docs/bots/README.md) - Overview of all bots in the system
- [Creating New Bots](./docs/bots/CreatingNewBots.md) - Guide to creating new bots
- [Bot Examples](./docs/bots/) - Individual documentation for each bot

## 🧪 Testing

Run the test suite:

```bash
npm test
```

The project uses Jest for testing and includes comprehensive tests for all bots and services.
