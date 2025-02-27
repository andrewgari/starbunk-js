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

## E2E Testing

This project includes Cypress E2E tests to verify that all bots correctly respond to their trigger conditions. These tests send real messages to Discord and verify the responses.

### Running E2E Tests

To run the E2E tests:

1. Make sure the Discord bot is running and properly configured with the correct token in your `.env` file.
2. Run the tests using one of the following commands:

```bash
# Run all E2E tests
npm run test:e2e

# Run only bot tests
npm run test:e2e:bots

# Run bot tests (direct pattern match)
npm run test:bots

# Open Cypress UI
npm run cypress:open
```

### Test Structure

The E2E tests are located in the `cypress/e2e/bots` directory. Each bot has tests that verify:

1. The bot responds correctly to its trigger conditions
2. The bot does not respond to messages that should not trigger it

For more information about the E2E tests, see the [Cypress README](cypress/README.md).

## CI/CD

This project uses GitHub Actions for continuous integration and deployment. The following workflows are included:

- **PR Build**: Builds the TypeScript code and uploads artifacts
- **PR Unit Tests**: Runs Jest unit tests (depends on Build)
- **PR E2E Tests**: Runs Cypress E2E tests for bots (depends on Build and Unit Tests)
- **PR Docker Build**: Builds the Docker image (depends on all previous steps)
- **PR Lint**: Ensures code quality by running ESLint

All workflows must pass before a pull request can be merged.
