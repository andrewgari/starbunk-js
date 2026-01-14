# BunkBot

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

### Available Scripts

#### Running the Application

- `npm run dev` - Run in development mode with hot reload (recommended for development)
- `npm run dev:watch` - Same as dev (alias for consistency)
- `npm run start` - Run the pre-built application from dist/
- `npm run start:prod` - Build and then run the application

#### Building

- `npm run build` - Build for production with source maps and declarations
- `npm run build:docker` - Build for Docker (optimized, no source maps)
- `npm run rebuild` - Clean and rebuild from scratch

#### Utilities

- `npm run type-check` - Type check without building
- `npm run clean` - Remove build artifacts

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

# Optional
BUNKBOT_BOTS_DIR=/path/to/bots/config  # Default: config/bots
DEBUG_MODE=false
LOG_LEVEL=info
```

## Docker Deployment

### Building the Docker Image

```bash
# From the repository root
docker build -f apps/bunkbot/Dockerfile -t bunkbot:latest .
```

### Running with Docker Compose

#### Production

```bash
# From the repository root
docker compose up bunkbot -d
```

#### Development

```bash
# From the bunkbot directory
cd apps/bunkbot
docker compose -f docker-compose.dev.yml up
```

### Docker Environment Variables

The Docker container supports the following environment variables:

**Discord Configuration:**
- `BUNKBOT_TOKEN` or `DISCORD_TOKEN` - Discord bot token (required)
- `CLIENT_ID` - Discord application client ID
- `GUILD_ID` - Discord server/guild ID
- `BUNKBOT_BOTS_DIR` - Path to bot configuration directory (default: `/app/config/bots`)

**Logging:**
- `DEBUG_MODE` - Enable debug mode (default: `false`)
- `LOG_LEVEL` - Logging level: `error`, `warn`, `info`, `debug` (default: `info`)
- `ENABLE_STRUCTURED_LOGGING` - Enable JSON structured logging for Promtail/Loki (default: `true`)
- `LOKI_URL` - Loki endpoint URL for log aggregation (optional)

**Metrics & Observability:**
- `ENABLE_METRICS` - Enable Prometheus metrics (default: `true`)
- `METRICS_PORT` - Port for metrics and health endpoints (default: `3000`)

**General:**
- `NODE_ENV` - Node environment: `development`, `production` (default: `production`)

### Volume Mounts

The container expects the bot configuration directory to be mounted:

```yaml
volumes:
  - ./config/bots:/app/config/bots:ro
```

This allows you to edit bot configurations without rebuilding the container.

## Architecture

BunkBot uses a modular architecture:

- **Bot Registry**: Manages all active bots
- **Bot Discovery**: Automatically discovers and loads bots from YAML files
- **YAML Factory**: Creates bot instances from YAML configuration
- **Discord Service**: Handles Discord API interactions
- **Webhook Service**: Manages Discord webhooks for bot responses

## Observability

BunkBot includes built-in observability features for production monitoring:

### Metrics

Prometheus metrics are exposed at `http://localhost:3000/metrics` (or the configured `METRICS_PORT`).

**Available Metrics:**
- `bunkbot_messages_processed_total` - Total messages processed
- `bunkbot_bot_triggers_total` - Total bot triggers by bot name and trigger
- `bunkbot_bot_responses_total` - Total bot responses sent
- `bunkbot_bot_response_duration_ms` - Response latency histogram
- `bunkbot_bot_errors_total` - Total bot errors
- `bunkbot_active_bots` - Number of active bots loaded
- Standard Node.js metrics (CPU, memory, event loop, etc.)

### Health Checks

Health check endpoints for Kubernetes/Docker:

- `GET /health` or `/ready` - Readiness check with uptime and status
- `GET /live` - Liveness check (simple alive status)
- `GET /metrics` - Prometheus metrics endpoint

### Structured Logging

When `ENABLE_STRUCTURED_LOGGING=true`, all logs are output as JSON for easy parsing by log aggregators like Promtail/Loki:

```json
{
  "level": "info",
  "message": "Bot triggered",
  "timestamp": "2024-01-13T12:00:00.000Z",
  "service": "bunkbot",
  "bot_name": "nice-bot",
  "guild_id": "123456789"
}
```

### Integration with Grafana Stack

BunkBot is designed to work with the Grafana observability stack:

- **Prometheus** - Scrapes `/metrics` endpoint for metrics
- **Loki** - Collects structured JSON logs via Promtail
- **Grafana** - Visualizes metrics and logs

Docker labels are automatically set for Prometheus service discovery:
- `prometheus.io/scrape=true`
- `prometheus.io/path=/metrics`
- `prometheus.io/port=3000`

## Bot Configuration

Bots are configured using YAML files in the `config/bots` directory. See the main repository documentation for YAML bot configuration syntax.

