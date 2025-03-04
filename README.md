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
- `/src/openai`: OpenAI integration for enhanced responses
- `/src/webhooks`: Webhook utilities for custom messages
- `/src/services`: Logging and other utilities
