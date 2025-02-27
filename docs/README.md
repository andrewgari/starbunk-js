# Starbunk Discord Bot Framework

Starbunk is a Discord bot framework built on Discord.js that provides a modular structure for creating interactive Discord bots with support for voice commands, reply bots, and various interaction types.

## Getting Started

### Prerequisites

- Node.js 16.x or higher
- npm or yarn
- A Discord bot token (see [Discord Developer Portal](https://discord.com/developers/applications))

### Installation

1. Clone the repository

    ```bash
    git clone https://github.com/yourusername/starbunk-js.git
    cd starbunk-js
    ```

2. Install dependencies

    ```bash
    npm install
    ```

3. Set up environment variables

    ```bash
    cp .env.example .env
    ```

    Edit the `.env` file and add your Discord bot token and other required variables.

4. Build the project

    ```bash
    npm run build
    ```

5. Start the bot
    ```bash
    npm start
    ```

## Documentation

This project is organized into several components, each with their own documentation:

- [Command System](./COMMANDS.md) - How to create and implement slash commands for the bot
- [Reply Bots](./REPLY_BOTS.md) - Quick guide to creating text-based reply bots
- [Voice Bots](./VOICE_BOTS.md) - Guide to creating voice channel event handlers
- [Music Commands](./MUSIC_COMMANDS.md) - Creating commands for music playback

## Architecture

The Starbunk framework uses a modular architecture with these main components:

```
src/
├── index.ts                  # Main entry point
├── services/                 # Shared services (logging, config, etc.)
├── starbunk/                 # Core bot functionality
│   ├── bots/                 # Bot implementations
│   │   ├── reply-bots/       # Text-based reply bots
│   │   ├── voice-bots/       # Voice channel event handlers
│   │   ├── replyBot.ts       # Reply bot interface
│   │   ├── voiceBot.ts       # Voice bot interface
│   │   ├── commands/             # Discord slash commands
│   │   │   ├── admin/            # Administrative commands
│   │   │   ├── fun/              # Fun/entertainment commands
│   │   │   ├── music/            # Music playback commands
│   │   │   ├── utility/          # Utility commands
│   │   │   ├── command.ts        # Command interface
│   │   │   └── index.ts          # Command registration
│   │   ├── events/               # Discord event handlers
│   │   │   ├── messageCreate.ts  # Message event handler
│   │   │   ├── ready.ts          # Bot ready event handler
│   │   │   └── ...               # Other event handlers
│   │   ├── services/             # Bot-specific services
│   │   │   ├── musicPlayer.ts    # Music playback service
│   │   │   └── ...               # Other services
│   │   ├── starbunkClient.ts     # Main client class
│   │   └── snowbunkClient.ts     # Secondary client class
│   └── tests/                # Tests
│       └── ...                   # Test files
└── tests/                # Tests
    └── ...                   # Test files
```
