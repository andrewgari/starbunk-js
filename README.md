# 🤖 BunkBot Discord Bot

A powerful Discord bot designed for seamless cross-server communication and community management.

## ✨ Features

- 🔄 **Cross-Server Sync**: Bridge channels between Snowbunk and StarBunk communities
- 🎮 **Smart Message Relay**: Intelligent webhook system for natural communication flow
- 🎵 **Media Support**: High-quality audio playback with ffmpeg integration
- 🐳 **Modern Deployment**: Containerized with Docker for reliable hosting
- 🔒 **Secure Design**: Runs with non-root user in production

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
    ```

    ```
