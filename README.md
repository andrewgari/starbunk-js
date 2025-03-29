# Starbunk-JS

A Discord bot system built using Discord.js, featuring two main bots (Starbunk and Snowbunk) with multiple specialized reply bots.

## Recent Changes
- **Fixed Module Loading**: Fixed an issue where bots and commands weren't loading in production mode. The path resolution now properly checks if running in development or production mode and uses the appropriate directory (src vs dist).
- **Removed Unused Scripts**: Removed the `scripts/check-docker-boot.js` script which was no longer needed. Updated package.json to remove references to this script.

## Architecture

The application uses an Observer pattern where the main clients (StarbunkClient and SnowbunkClient) act as observable subjects that notify various bot observers when messages or voice events occur.

```
┌─────────────────┐     ┌─────────────────┐
│  StarbunkClient │     │  SnowbunkClient │
└────────┬────────┘     └────────┬────────┘
         │                       │
         │   Observer Pattern    │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│   Event Stream   │     │  Channel Sync   │
└────────┬────────┘     └─────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│              Bot Collections              │
├──────────────────┬───────────────────────┤
│   Reply Bots     │     Voice Bots        │
├──────────────────┴───────────────────────┤
│            Command Handlers              │
└──────────────────────────────────────────┘
```

### Core Components

1. **Discord Clients**

    - `StarbunkClient`: Main bot for reactions and commands
    - `SnowbunkClient`: Channel synchronization bot

2. **Bot Types**

    - **Reply Bots**: Respond to specific message patterns
    - **Voice Bots**: React to voice channel events and manage voice channel behavior
    - **Strategy Bots**: Advanced bots using composable triggers and responses
    - **DJ Cova**: Music playback functionality

3. **Event Flow**
    1. Discord events (messages, voice state changes) are received by clients
    2. Clients notify registered bots through the observer pattern
    3. Each bot processes the event according to its specific logic
    4. Responses are sent via webhook service for customized appearances

## Setup

1. Clone the repository:

    ```
    git clone https://github.com/andrewgari/starbunk-js.git
    cd starbunk-js
    ```

2. Install dependencies:

    ```
    npm install
    ```

3. Create a `.env` file based on `.env_sample`:

    ```
    STARBUNK_TOKEN=your_discord_token
    SNOWBUNK_TOKEN=your_discord_token
    CLIENT_ID=your_client_id
    GUILD_ID=your_guild_id

    # Optional webhook for bot impersonation (without this, fallback to regular messages)
    WEBHOOK_URL=https://discord.com/api/webhooks/{webhook_id}/{webhook_token}

    # LLM configurations
    OLLAMA_API_URL=http://localhost:11434
    OLLAMA_DEFAULT_MODEL=llama3
    OPENAI_API_KEY=your_openai_key
    ```

4. Build the project:

    ```
    npm run build
    ```

5. Start the bots:
    ```
    npm start
    ```

## Docker Setup

### Environment Configuration

Before running the bot with Docker, make sure to set up your environment:

1. Copy `.env_sample` to `.env`:
   ```bash
   cp .env_sample .env
   ```

2. Edit `.env` and add your Discord bot token, client ID, and other required credentials:
   ```
   STARBUNK_TOKEN=your_discord_bot_token_here
   CLIENT_ID=your_discord_client_id_here
   GUILD_ID=your_discord_guild_id_here
   ```

### Running with Docker Compose

To build and run the bot with Docker Compose:

```bash
docker-compose up --build
```

For development mode with hot reloading:

```bash
docker-compose -f docker-compose.yml -f docker-compose.override.yml up --build
```

### Troubleshooting Docker Issues

If you encounter issues with Docker:

1. Make sure your `.env` file is properly configured with all required variables
2. Verify that `.env` isn't being ignored during the Docker build process
3. Check container logs for specific error messages:
   ```bash
   docker-compose logs
   ```

## Development

```
npm run dev
```

## Testing

```
npm test
```

## Project Organization

- `/src/starbunk`: Main Starbunk bot implementation
- `/src/snowbunk`: Snowbunk channel sync implementation
- `/src/discord`: Discord.js utilities and base client
- `/src/services/llm`: LLM service for AI-powered responses
  - Supports multiple providers (Ollama as primary, OpenAI as fallback)
  - Extensible architecture for adding new providers
  - Prompt management system
- `/src/webhooks`: Webhook utilities for custom messages
- `/src/services`: Logging and other utilities

## Debug Mode

The application includes a comprehensive debug mode that helps with development and troubleshooting.

### Features

- **Log Levels**: Control verbosity (NONE, ERROR, WARN, INFO, DEBUG)
- **Command Tracing**: Track command execution with timing information
- **Event Tracing**: Monitor Discord events with detailed payload logging
- **API Tracing**: Log API calls with request/response details
- **Memory Monitoring**: Track memory usage statistics
- **Performance Metrics**: Measure execution time of critical operations
- **Channel Redirection**: Redirect all operations to test channels when enabled

### Configuration

Debug mode can be configured through environment variables:

```
# Debug Configuration
DEBUG=true                      # Master switch for debug mode (sets log level to DEBUG)
DEBUG_LOG_LEVEL=4               # 0=NONE, 1=ERROR, 2=WARN, 3=INFO, 4=DEBUG
DEBUG_COMMAND_TRACING=true      # Enable command execution tracing
DEBUG_EVENT_TRACING=true        # Enable Discord event tracing
DEBUG_API_TRACING=true          # Enable API call tracing
DEBUG_MEMORY_MONITORING=true    # Enable memory usage monitoring
DEBUG_PERFORMANCE_METRICS=true  # Enable performance timing
DEBUG_CHANNEL_REDIRECT=true     # Enable channel redirection to test channels
```

### Discord Command

Debug mode can also be controlled through the `/debug` Discord command:

- `/debug status`: Show current debug configuration
- `/debug toggle`: Toggle all debug features on/off
- `/debug set feature:commandTracing enabled:true`: Enable a specific feature
- `/debug loglevel level:4`: Set the log level

### Channel Redirection

When channel redirection is enabled, all operations that would normally target production channels are redirected to test channels. This allows for safe testing without affecting production channels.

To configure test channels, edit the `src/discord/testIDs.ts` file with your test server's channel, guild, and user IDs.

### Usage Example

```typescript
// Import the debug manager
import DebugManager from './utils/DebugManager';

// Log a trace message (only shown at TRACE level)
DebugManager.trace('Detailed trace information');

// Track command execution time
const startTime = DebugManager.logCommandExecution('myCommand', { arg1: 'value' }, 'guildId');
// ... command logic ...
DebugManager.logCommandCompletion('myCommand', startTime);

// Use the Discord debug wrapper to automatically redirect channels
import DiscordDebugWrapper from './utils/DiscordDebugWrapper';
const channel = await DiscordDebugWrapper.getTextChannel(client, channelId);
```

## Bot Commands

The bot system includes several commands for managing bot behavior:

### Reply Bot Commands
- `/bot enable <bot_name>` - Enable a bot
- `/bot disable <bot_name>` - Disable a bot
- `/bot frequency <bot_name> <rate>` - Set a reply bot's response rate (0-100%)
- `/bot list-bots` - List all available bots and their status
- `/bot report <bot_name> <message>` - Report a bot issue to Cova

### Voice Bot Commands
- `/bot volume <bot_name> <volume>` - Set a voice bot's volume (0-100%)
- `/bot enable <bot_name>` - Enable a voice bot
- `/bot disable <bot_name>` - Disable a voice bot
- `/bot list-bots` - List all available bots (includes voice bots)

## Commands

The bot provides various commands to interact with its functionality:

### General Commands
- `/ping`: Check if the bot is working properly
- `/rpghelp`: Lists all available RPG game management commands and their descriptions

### RPG Game Management
The bot includes comprehensive RPG game management commands for tabletop role-playing games:
- Campaign management
- Session scheduling
- Character management
- Game content organization
- Vector-based knowledge search

For a complete list of all RPG commands and their descriptions, use the `/rpghelp` command.
