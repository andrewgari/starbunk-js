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

### 🧠 **CovaBot** - AI Personality
- **Purpose**: AI-powered personality simulation and responses
- **Dependencies**: LLM services, Minimal database
- **Features**: Personality-driven responses, user behavior mimicking
- **Scaling**: LLM-optimized for AI processing

### 💙 **BlueBot** - Blue Detection Bot
- **Purpose**: Detects and responds to mentions of "blue" or Blue Mage references
- **Dependencies**: Discord.js, OpenAI (optional), Database
- **Features**: Pattern matching, LLM-enhanced detection, contextual responses
- **Scaling**: Lightweight, optimized for message processing

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
npm run dev:covabot      # AI personality
npm run dev:bluebot      # Blue detection
```

## 📋 Environment Configuration

### Required for All Containers
```env
STARBUNK_TOKEN=your_discord_bot_token
```

### Container-Specific Variables
```env
# Database-dependent containers (BunkBot, CovaBot)
DATABASE_URL=postgresql://user:pass@postgres:5432/starbunk

# LLM-dependent containers (CovaBot)
OPENAI_API_KEY=your_openai_key
OLLAMA_API_URL=http://ollama:11434

# Development
DEBUG=true
NODE_ENV=development
```

## 🗄️ Database Services

The stack includes three internal database services for data persistence:

### Redis - In-Memory Data Store
- **Purpose**: Social battery tracking, caching, session data
- **Service**: `starbunk-redis` (container: `starbunk-cache`)
- **Port**: 6379 (internal only)
- **Memory**: 256MB limit, allkeys-lru eviction policy
- **Persistence**: Snapshots every 60s if at least 1 change
- **Data**: `/data/redis` volume mount

**Configuration**:
```env
REDIS_HOST=starbunk-redis  # Use service name for internal networking
REDIS_PORT=6379
REDIS_PASSWORD=            # Optional: set for production
REDIS_DB=0
```

> **Note**: Use the service name `starbunk-redis` (not the container name `starbunk-cache`) for REDIS_HOST. Docker Compose uses service names for internal DNS resolution.

**Using External Redis** (optional):
```env
REDIS_HOST=192.168.1.100   # Point to external Redis server
REDIS_PASSWORD=your_password
```

### PostgreSQL - Relational Database
- **Purpose**: Persistent bot data, user settings
- **Service**: `starbunk-postgres` (container: `starbunk-db`)
- **Port**: 5432 (internal only)
- **Memory**: 512MB limit
- **Data**: `/data/postgres` volume mount

### Qdrant - Vector Database
- **Purpose**: Saliency/interest matching, semantic search
- **Service**: `starbunk-qdrant` (container: `starbunk-vectordb`)
- **Port**: 6333 (internal only)
- **Memory**: 512MB limit
- **Data**: `/data/qdrant` volume mount

**Architecture Notes**:
- All database services run within the `starbunk-network` and are not exposed to the host
- Services can be replaced with external instances by updating environment variables
- Data persists in `${HOST_WORKDIR}/data/` directory structure
- Each service includes health checks for reliability

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
npm run logs:covabot
npm run logs:bluebot
```

### Individual Container Development
```bash
# Work on specific containers
cd src/bunkbot && npm run dev
cd src/djcova && npm run dev
cd src/covabot && npm run dev
```

## 📁 Container Structure

```
src/
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

    subgraph "Bot Services"
        Discord <-->|Bot API| BunkBot[🤖 BunkBot<br/>Reply Bots + Admin]
        Discord <-->|Voice API| DJCova[🎵 DJCova<br/>Music Service]
        Discord <-->|Bot API| CovaBot[🧠 CovaBot<br/>AI Personality]
        Discord <-->|Bot API| BlueBot[💙 BlueBot<br/>Blue Detection]
    end

    subgraph "Database Services"
        PostgresDB[(PostgreSQL<br/>Persistent Data)]
        RedisDB[(Redis<br/>Cache/Sessions)]
        QdrantDB[(Qdrant<br/>Vector Search)]
    end

    subgraph "External Services"
        LLM[LLM Services<br/>OpenAI/Ollama]
        Webhooks[Webhook Manager]
    end

    BunkBot --> PostgresDB
    CovaBot --> PostgresDB
    CovaBot --> RedisDB
    CovaBot --> QdrantDB
    BlueBot --> PostgresDB

    CovaBot --> LLM
    BunkBot --> Webhooks
    CovaBot --> Webhooks

    style BunkBot fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    style DJCova fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    style CovaBot fill:#fff3e0,stroke:#e65100,stroke-width:2px
    style BlueBot fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style PostgresDB fill:#336791,stroke:#fff,stroke-width:2px,color:#fff
    style RedisDB fill:#DC382D,stroke:#fff,stroke-width:2px,color:#fff
    style QdrantDB fill:#24386C,stroke:#fff,stroke-width:2px,color:#fff
    style LLM fill:#bfb,stroke:#333,stroke-width:1px
```

## 🔄 Container Bootstrap Flow

```mermaid
sequenceDiagram
    participant Docker as Docker Compose
    participant Shared as Shared Package
    participant BunkBot as BunkBot Container
    participant DJCova as DJCova Container
    participant CovaBot as CovaBot Container
    participant BlueBot as BlueBot Container

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
        Docker->>CovaBot: Start container
        CovaBot->>CovaBot: Validate STARBUNK_TOKEN + LLM
        CovaBot->>CovaBot: Initialize AI services
        CovaBot-->>Docker: ✅ Ready
    and
        Docker->>BlueBot: Start container
        BlueBot->>BlueBot: Validate STARBUNK_TOKEN
        BlueBot->>BlueBot: Initialize detection services
        BlueBot-->>Docker: ✅ Ready
    end
```

## ✅ How to Start a Task

Use standardized manifests for zero-ambiguity work:

- Global index: see [docs/TASKS.md](docs/TASKS.md).
- Scoped manifests: [src/bluebot/TODO.md](src/bluebot/TODO.md), [src/bunkbot/TODO.md](src/bunkbot/TODO.md), [src/covabot/TODO.md](src/covabot/TODO.md).

Each manifest entry must define:
- Context (Issue/User Story link)
- File scope (absolute paths)
- The change (logic + pattern references)
- Validation gates:
    - Tests with `vitest` in the affected package
    - Repo validations via [scripts/validation/run-all-validations.sh](scripts/validation/run-all-validations.sh)
    - Tracing per [docs/observability/TRACING.md](docs/observability/TRACING.md)
    - Security Snyk scan per [.github/instructions/snyk_rules.instructions.md](.github/instructions/snyk_rules.instructions.md)

See the master architect spec at [.github/agents/master-architect.agent.md](.github/agents/master-architect.agent.md) for delegation protocol and lifecycle.

## 🧪 Testing

The container architecture uses Jest with project-based testing:

```bash
# Test all containers
npm test

# Test specific containers
npm run test:shared
npm run test:bunkbot
npm run test:djcova
npm run test:covabot
npm run test:bluebot

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
| **BunkBot** | 0.5 cores | 256MB | Minimal | High (webhooks) |
| **DJCova** | 1-2 cores | 1GB | Moderate (cache) | High (voice) |
| **CovaBot** | 0.5-1 cores | 1GB | Low | Moderate |
| **BlueBot** | 0.25-0.5 cores | 512MB | Minimal | Low |
| **PostgreSQL** | 0.5 cores | 512MB | High | Low |
| **Redis** | 0.25 cores | 256MB | Low (snapshots) | Low |
| **Qdrant** | 0.5 cores | 512MB | Moderate | Low |
| **OTEL Collector** | 0.5 cores | 512MB | Minimal | Moderate |

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
docker-compose ps starbunk-postgres

# Test PostgreSQL connection
docker-compose exec starbunk-postgres psql -U starbunk -d starbunk

# Check Redis status
docker-compose ps starbunk-redis

# Test Redis connection
docker-compose exec starbunk-redis redis-cli ping
# Expected output: PONG

# Test Redis with password
docker-compose exec starbunk-redis redis-cli -a your_password ping

# Check Qdrant status
docker-compose ps starbunk-qdrant

# View database service logs
docker-compose logs starbunk-redis
docker-compose logs starbunk-postgres
docker-compose logs starbunk-qdrant
```

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Discord.js team for their excellent library
- Ollama and OpenAI for LLM capabilities
- All contributors to the project
# Trigger rebuild
