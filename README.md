# 🤖 BunkBot Discord Bot

A powerful Discord bot designed for seamless cross-server communication and community management.

![Build](https://github.com/andrewgari/starbunk-js/actions/workflows/pr-build.yml/badge.svg)
![Unit Tests](https://github.com/andrewgari/starbunk-js/actions/workflows/pr-unit-test.yml/badge.svg)
![E2E Tests](https://github.com/andrewgari/starbunk-js/actions/workflows/pr-e2e-test.yml/badge.svg)
![Docker](https://github.com/andrewgari/starbunk-js/actions/workflows/pr-docker-build.yml/badge.svg)
![Lint](https://github.com/andrewgari/starbunk-js/actions/workflows/pr-lint.yml/badge.svg)

## ✨ Features

- 🔄 **Cross-Server Sync**: Bridge channels between Snowbunk and StarBunk communities
- 🎮 **Smart Message Relay**: Intelligent webhook system for natural communication flow
- 🎵 **Media Support**: High-quality audio playback with ffmpeg integration
- 🐳 **Modern Deployment**: Containerized with Docker for reliable hosting
- 🔒 **Secure Design**: Runs with non-root user in production
- 🧩 **Class-Based Bot Architecture**: Modular and extensible bot system using class inheritance

## 📚 Documentation

- [Installation Guide](docs/installation.md)
- [Configuration Guide](docs/configuration.md)
- [Testing Guide](docs/testing.md) - Instructions for linting, testing, building, and Docker usage
- [API Documentation](docs/api.md)
- [Contributing Guidelines](CONTRIBUTING.md)

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

4. Run the comprehensive development check:

    ```bash
    npm run dev
    ```

    This will:

    - Run linting checks
    - Execute unit tests
    - Build the project
    - Run Cypress tests (if Xvfb is installed)
    - Build the Docker image (if Docker is installed)
    - Verify the application starts correctly

## 🚀 Running the Bot

### Prerequisites

1. Make sure you have Node.js installed (v16.0.0 or higher)
2. Create a `.env` file in the root directory based on the `.env_sample` file
3. Fill in the required environment variables in the `.env` file:
    - `STARBUNK_TOKEN`: Discord token for the Starbunk bot
    - `SNOWBUNK_TOKEN`: Discord token for the Snowbunk bot
    - `GUILD_ID`: ID of your Discord server
    - `CLIENT_ID`: Client ID of your Discord application

### Starting the Bot

To start the bot, run:

```bash
npm install  # Install dependencies (only needed once)
npm run build  # Build the TypeScript code
npm run start  # Start the bot
```

The bot will connect to Discord using the tokens provided in your `.env` file.

### Stopping the Bot

To stop the running bot, you can press `Ctrl+C` in the terminal where the bot is running. If the bot is running in the background, you can find and stop the process using:

```bash
# Find the bot process
ps aux | grep "node dist/bunkbot.js"

# Stop the process (replace PID with the actual process ID)
kill PID
```

## 🤖 Bot Architecture

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
		.withResponseStatic('Hello there!')
		.build();
}
```
