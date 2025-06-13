# Starbunk-JS Modular Architecture

## Overview

The Starbunk-JS Discord bot has been refactored into a modular, containerized architecture with 4 separate containers, each handling specific functionality. This provides better isolation, independent scaling, and easier maintenance.

## Container Architecture

### 1. **BunkBot** (`containers/bunkbot/`)
**Purpose**: Reply bots and admin commands
- **Dependencies**: Discord.js, Prisma, basic Discord API features
- **Features**:
  - All reply bots (excluding AI Cova)
  - Bot management commands
  - General admin commands
  - Webhook-based message output
- **Token**: `STARBUNK_TOKEN`
- **Port**: 3000

### 2. **DJCova** (`containers/djcova/`)
**Purpose**: Music service
- **Dependencies**: Discord.js Voice, ffmpeg, ytdl-core, play-dl
- **Features**:
  - Music playback from YouTube
  - Voice channel management
  - Audio streaming and queue management
  - Volume control
- **Token**: `STARBUNK_TOKEN`
- **Port**: 3001

### 3. **Starbunk-DND** (`containers/starbunk-dnd/`)
**Purpose**: D&D features and Snowbunk bridge
- **Dependencies**: Discord.js, Prisma, Transformers, OpenAI, Mammoth
- **Features**:
  - RPG commands and campaign management
  - Vector embeddings and text processing
  - Cross-server message bridging (Snowbunk)
  - File storage for campaign data
- **Tokens**: `STARBUNK_TOKEN`, `SNOWBUNK_TOKEN`
- **Port**: 3002

### 4. **CovaBot** (`containers/covabot/`)
**Purpose**: AI personality bot
- **Dependencies**: Discord.js, OpenAI, Transformers, Prisma
- **Features**:
  - LLM-powered personality simulation
  - User behavior mimicking
  - AI-generated responses
- **Token**: `STARBUNK_TOKEN`
- **Port**: 3003

## Shared Services

### **Shared Package** (`containers/shared/`)
Contains common utilities and services used across all containers:
- Logger service
- Database connections
- Discord utilities
- Error handling
- Configuration management
- Type definitions

## Directory Structure

```
containers/
├── shared/                 # Shared services and utilities
│   ├── src/
│   │   ├── services/      # Common services (logger, database, etc.)
│   │   ├── utils/         # Utility functions
│   │   ├── interfaces/    # Shared interfaces
│   │   └── types/         # Type definitions
│   └── package.json
├── bunkbot/               # Reply bots + admin commands
│   ├── src/
│   │   ├── reply-bots/    # All reply bot implementations
│   │   ├── commands/      # Admin commands
│   │   └── index.ts       # Main entry point
│   ├── Dockerfile
│   └── package.json
├── djcova/                # Music service
│   ├── src/
│   │   ├── commands/      # Music commands (play, stop, volume)
│   │   ├── djCova.ts      # Music player implementation
│   │   └── index.ts       # Main entry point
│   ├── Dockerfile
│   └── package.json
├── starbunk-dnd/          # D&D features + Snowbunk bridge
│   ├── src/
│   │   ├── commands/      # RPG commands
│   │   ├── services/      # Campaign, vector, file services
│   │   ├── snowbunk/      # Cross-server bridge
│   │   └── index.ts       # Main entry point
│   ├── Dockerfile
│   └── package.json
└── covabot/               # AI personality bot
    ├── src/
    │   ├── cova-bot/      # AI Cova implementation
    │   └── index.ts       # Main entry point
    ├── Dockerfile
    └── package.json
```

## Development Workflow

### Setup
```bash
# Install dependencies for all containers
npm run setup:containers

# Build all containers
npm run build

# Start development environment
npm run start:dev
```

### Individual Container Development
```bash
# Work on specific container
npm run dev:bunkbot
npm run dev:djcova
npm run dev:starbunk-dnd
npm run dev:covabot
```

### Testing
```bash
# Test all containers
npm test

# Test specific container
npm run test:bunkbot
npm run test:djcova
npm run test:starbunk-dnd
npm run test:covabot
```

## Deployment

### Production
```bash
# Build and start all containers
docker-compose -f docker-compose.new.yml up -d

# View logs
npm run logs

# View specific container logs
npm run logs:bunkbot
```

### Development
```bash
# Start development environment with hot reload
docker-compose -f docker-compose.dev.yml up -d
```

## Environment Variables

Each container requires specific environment variables:

### Common (All Containers)
- `NODE_ENV`: Environment (development/production)
- `DEBUG`: Enable debug logging
- `STARBUNK_TOKEN`: Main Discord bot token

### Database-dependent Containers (BunkBot, Starbunk-DND, CovaBot)
- `DATABASE_URL`: PostgreSQL connection string

### LLM-dependent Containers (Starbunk-DND, CovaBot)
- `OPENAI_API_KEY`: OpenAI API key
- `OLLAMA_API_URL`: Ollama API URL

### Starbunk-DND Specific
- `SNOWBUNK_TOKEN`: Snowbunk Discord bot token
- `VECTOR_CONTEXT_DIR`: Vector embeddings directory

## Benefits of This Architecture

1. **Isolation**: Each container handles specific functionality, preventing cascading failures
2. **Scalability**: Containers can be scaled independently based on load
3. **Maintainability**: Clear separation of concerns makes code easier to maintain
4. **Deployment**: Individual containers can be deployed and updated independently
5. **Resource Optimization**: Each container only includes dependencies it needs
6. **Development**: Developers can work on specific features without affecting others

## Migration from Monolith

The original monolithic structure has been preserved in the `src/` directory for reference. The new modular architecture maintains all existing functionality while providing better organization and isolation.
