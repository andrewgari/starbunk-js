# BunkBot 2

Next generation reply bot system for Discord.

## Development

### Prerequisites

- Node.js >= 18
- npm

### Setup

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode with hot reload
npm run dev

# Type check without building
npm run type-check

# Clean build artifacts
npm run clean
```

### Build Scripts

- `npm run build` - Build for production with source maps and declarations
- `npm run build:docker` - Build for Docker (optimized, no source maps)
- `npm run start` - Run the built application
- `npm run dev` - Run in development mode with hot reload

### Project Structure

```
src/
├── core/              # Core bot logic (conditions, triggers, responses)
├── discord/           # Discord service integrations
├── reply-bots/        # Bot registry and discovery
├── serialization/     # YAML parsing and bot factory
└── index.ts           # Application entry point
```

### Environment Variables

Create a `.env` file in the project root with:

```env
BUNKBOT_TOKEN=your_discord_bot_token
# or
DISCORD_TOKEN=your_discord_bot_token
```

## Architecture

BunkBot 2 uses a modular architecture:

- **Bot Registry**: Manages all active bots
- **Bot Discovery**: Automatically discovers and loads bots from YAML files
- **YAML Factory**: Creates bot instances from YAML configuration
- **Discord Service**: Handles Discord API interactions
- **Webhook Service**: Manages Discord webhooks for bot responses

