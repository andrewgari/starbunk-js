# StarBunk Discord Bot - Container Architecture

A sophisticated Discord bot built with TypeScript using a **4-container modular architecture** that provides scalable, isolated services for different bot functionalities.

## 🏗️ Container Architecture

StarBunk is built as **4 independent containers**, each handling specific functionality:

### 🤖 **BunkBot** - Reply Bots & Admin Commands
- **Purpose**: Handles reply bots and administrative commands
- **Dependencies**: Discord.js, Webhooks, Basic Database
- **Features**: Bot management, admin commands, webhook-based responses
- **Scaling**: Lightweight, optimized for high message volume

### 🎵 **DJCova** - Music Service
- **Purpose**: Voice channel music playback and audio processing
- **Dependencies**: Discord.js Voice, ffmpeg, audio libraries
- **Features**: YouTube playback, voice channel management, audio streaming
- **Scaling**: CPU-optimized for audio processing

### 🐉 **Starbunk-DND** - D&D Features & Bridge
- **Purpose**: D&D campaign management and cross-server bridging
- **Dependencies**: Full LLM stack, Database, File processing, Snowbunk bridge
- **Features**: Campaign management, vector embeddings, cross-server messaging
- **Scaling**: Memory-optimized for LLM and data processing

### 🧠 **CovaBot** - AI Personality
- **Purpose**: AI-powered personality simulation and responses
- **Dependencies**: LLM services, Minimal database
- **Features**: Personality-driven responses, user behavior mimicking
- **Scaling**: LLM-optimized for AI processing

## 🌟 Key Benefits

### 🔧 **Independent Scaling**
- Scale containers based on load (music service vs reply bots)
- Resource optimization per container type
- Independent deployment and updates

### 🛡️ **Isolation & Reliability**
- Container failures don't affect other services
- Independent environment validation
- Service-specific error boundaries

### 📦 **Optimized Dependencies**
- Each container only includes required dependencies
- Reduced attack surface and resource usage
- Faster startup times per service

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 20.x or higher (for development)
- Discord Bot Token

### Production Deployment
```bash
# Clone the repository
git clone https://github.com/andrewgari/starbunk-js.git
cd starbunk-js

# Set up environment
cp .env.example .env
# Edit .env with your tokens and configuration

# Start all containers
docker-compose up -d

# Monitor logs
npm run logs
```

### Development Setup
```bash
# Install dependencies for all containers
npm run setup:containers

# Build all containers
npm run build

# Start development environment
npm run start:dev

# Work on specific containers
npm run dev:bunkbot      # Reply bots + admin
npm run dev:djcova       # Music service
npm run dev:starbunk-dnd # D&D + bridge
npm run dev:covabot      # AI personality
```

## 📋 Environment Configuration

### Required for All Containers
```env
STARBUNK_TOKEN=your_discord_bot_token
```

### Container-Specific Variables
```env
# Database-dependent containers (BunkBot, Starbunk-DND, CovaBot)
DATABASE_URL=postgresql://user:pass@postgres:5432/starbunk

# LLM-dependent containers (Starbunk-DND, CovaBot)
OPENAI_API_KEY=your_openai_key
OLLAMA_API_URL=http://ollama:11434

# Starbunk-DND specific
SNOWBUNK_TOKEN=your_snowbunk_token
VECTOR_CONTEXT_DIR=/app/data/vectors

# Development
DEBUG=true
NODE_ENV=development
```

## 🛠️ Development Commands

### Container Management
```bash
# Build all containers
npm run build

# Test all containers
npm test

# Start production stack
npm run start

# Start development environment
npm run start:dev

# View logs
npm run logs
npm run logs:bunkbot
npm run logs:djcova
npm run logs:starbunk-dnd
npm run logs:covabot
```

### Individual Container Development
```bash
# Work on specific containers
cd containers/bunkbot && npm run dev
cd containers/djcova && npm run dev
cd containers/starbunk-dnd && npm run dev
cd containers/covabot && npm run dev
```

## 📁 Container Structure

```
containers/
├── shared/                   # Shared services and utilities
│   ├── src/
│   │   ├── services/        # Logger, webhook manager, etc.
│   │   ├── utils/           # Environment validation, error handling
│   │   ├── discord/         # Discord client factory
│   │   └── index.ts         # Shared exports
│   └── package.json
├── bunkbot/                 # Reply bots + admin commands
│   ├── src/
│   │   ├── index-minimal.ts # Container entry point
│   │   └── tests/           # Container-specific tests
│   ├── Dockerfile
│   └── package.json
├── djcova/                  # Music service
│   ├── src/
│   │   ├── index-minimal.ts # Container entry point
│   │   └── tests/           # Container-specific tests
│   ├── Dockerfile
│   └── package.json
├── starbunk-dnd/            # D&D features + Snowbunk bridge
│   ├── src/
│   │   ├── index-minimal.ts # Container entry point
│   │   └── tests/           # Container-specific tests
│   ├── Dockerfile
│   └── package.json
└── covabot/                 # AI personality bot
    ├── src/
    │   ├── index-minimal.ts # Container entry point
    │   └── tests/           # Container-specific tests
    ├── Dockerfile
    └── package.json
```

## 📊 Container Architecture Diagram

```mermaid
graph TD
    User([Discord User]) <-->|Interacts with| Discord[Discord Platform]

    subgraph "Container Stack"
        Discord <-->|Bot API| BunkBot[🤖 BunkBot<br/>Reply Bots + Admin]
        Discord <-->|Voice API| DJCova[🎵 DJCova<br/>Music Service]
        Discord <-->|Bot API| StarbunkDND[🐉 Starbunk-DND<br/>D&D + Bridge]
        Discord <-->|Bot API| CovaBot[🧠 CovaBot<br/>AI Personality]

        StarbunkDND <-->|Bridge| Snowbunk[Snowbunk Server]
    end

    subgraph "Shared Infrastructure"
        BunkBot --> SharedDB[(PostgreSQL)]
        StarbunkDND --> SharedDB
        CovaBot --> SharedDB

        StarbunkDND --> LLM[LLM Services<br/>OpenAI/Ollama]
        CovaBot --> LLM

        BunkBot --> Webhooks[Webhook Manager]
        CovaBot --> Webhooks
        StarbunkDND --> Webhooks
    end

    style BunkBot fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    style DJCova fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    style StarbunkDND fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    style CovaBot fill:#fff3e0,stroke:#e65100,stroke-width:2px
    style LLM fill:#bfb,stroke:#333,stroke-width:1px
```

## 🔄 Container Bootstrap Flow

```mermaid
sequenceDiagram
    participant Docker as Docker Compose
    participant Shared as Shared Package
    participant BunkBot as BunkBot Container
    participant DJCova as DJCova Container
    participant StarbunkDND as Starbunk-DND Container
    participant CovaBot as CovaBot Container

    Docker->>Shared: Build shared package
    Shared-->>Docker: ✅ Built

    par Container Initialization
        Docker->>BunkBot: Start container
        BunkBot->>BunkBot: Validate STARBUNK_TOKEN
        BunkBot->>BunkBot: Initialize webhook services
        BunkBot-->>Docker: ✅ Ready
    and
        Docker->>DJCova: Start container
        DJCova->>DJCova: Validate STARBUNK_TOKEN
        DJCova->>DJCova: Initialize voice services
        DJCova-->>Docker: ✅ Ready
    and
        Docker->>StarbunkDND: Start container
        StarbunkDND->>StarbunkDND: Validate tokens + DB + LLM
        StarbunkDND->>StarbunkDND: Initialize full services
        StarbunkDND-->>Docker: ✅ Ready
    and
        Docker->>CovaBot: Start container
        CovaBot->>CovaBot: Validate STARBUNK_TOKEN + LLM
        CovaBot->>CovaBot: Initialize AI services
        CovaBot-->>Docker: ✅ Ready
    end
```

## 🧪 Testing

The container architecture uses Jest with project-based testing:

```bash
# Test all containers
npm test

# Test specific containers
npm run test:shared
npm run test:bunkbot
npm run test:djcova
npm run test:starbunk-dnd
npm run test:covabot

# Test individual container
cd containers/bunkbot && npm test
```

## 🚀 Deployment

### Production Deployment
```bash
# Build and start all containers
docker-compose up -d

# Scale specific containers
docker-compose up -d --scale djcova=2 --scale bunkbot=3

# Update specific container
docker-compose up -d --no-deps bunkbot
```

### CI/CD Pipeline
The project includes GitHub Actions workflows for:
- **Continuous Integration**: Build and test all containers
- **Container Registry**: Push images to GitHub Container Registry
- **Deployment**: Automated deployment to production

## 📊 Container Resource Requirements

| Container | CPU | Memory | Storage | Network |
|-----------|-----|--------|---------|---------|
| **BunkBot** | 0.5 cores | 512MB | Minimal | High (webhooks) |
| **DJCova** | 1-2 cores | 1GB | Moderate (cache) | High (voice) |
| **Starbunk-DND** | 1-2 cores | 1GB | High (vectors) | Moderate |
| **CovaBot** | 0.5-1 cores | 512MB | Low | Moderate |
| **PostgreSQL** | 0.5 cores | 512MB | High | Low |

## 🔧 Troubleshooting

### Container Won't Start
```bash
# Check container logs
docker-compose logs bunkbot

# Check environment variables
docker-compose config

# Rebuild container
docker-compose build --no-cache bunkbot
```

### Database Connection Issues
```bash
# Check PostgreSQL status
docker-compose ps postgres

# Test database connection
docker-compose exec postgres psql -U starbunk -d starbunk
```

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Discord.js team for their excellent library
- Ollama and OpenAI for LLM capabilities
- All contributors to the project