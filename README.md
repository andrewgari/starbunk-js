# Starbunk-JS

A Discord bot system built using Discord.js, featuring two main bots (Starbunk and Snowbunk) with multiple specialized reply bots.

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
    - **Voice Bots**: React to voice channel events
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

## Docker Deployment

```
docker-compose up -d
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
