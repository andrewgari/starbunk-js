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
│   └── __tests__/                # Tests
│       └── ...                   # Test files
└── __tests__/                # Tests
    └── ...                   # Test files
```

## Core Components

### 1. Client Classes

- **StarbunkClient**: The main Discord client that handles events, command registration, and bot management
- **SnowbunkClient**: A secondary client for advanced features

### 2. Bot Types

- **Reply Bots**: Process and respond to text messages
- **Voice Bots**: Handle voice channel events

### 3. Command System

Uses Discord's slash command API to provide interactive commands.

### 4. Music System

Provides audio playback capabilities from YouTube sources.

## Project Structure

### Reply Bots

Reply bots are simple text-based bots that respond to specific patterns in messages. They implement the `ReplyBot` interface and are automatically loaded from the `src/starbunk/bots/reply-bots/` directory.

### Voice Bots

Voice bots handle voice channel events, such as users joining or leaving voice channels. They implement the `VoiceBot` interface and are automatically loaded from the `src/starbunk/bots/voice-bots/` directory.

### Commands

Slash commands provide interactive functionality through Discord's command system. Commands are organized by category and implement the `Command` interface.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Discord.js](https://discord.js.org/) - The Discord API wrapper
- [TypeScript](https://www.typescriptlang.org/) - The programming language
- [Jest](https://jestjs.io/) - The testing framework
