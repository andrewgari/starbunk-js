# Production Deployment Setup

This guide covers deploying Starbunk containers in production using pre-built images from GitHub Container Registry (GHCR).

## Prerequisites

### 1. Docker Images in GHCR
Ensure all four container images are built and published to GitHub Container Registry:
- `ghcr.io/andrewgari/starbunk-bunkbot:latest`
- `ghcr.io/andrewgari/starbunk-djcova:latest`
- `ghcr.io/andrewgari/starbunk-starbunk-dnd:latest`
- `ghcr.io/andrewgari/starbunk-covabot:latest`

### 2. Environment Configuration
Copy and configure your environment file:
```bash
cp .env.production.example .env
# Edit .env with your production values
```

Required variables:
```bash
# Discord Configuration
STARBUNK_TOKEN=your_discord_bot_token
SNOWBUNK_TOKEN=your_snowbunk_token
CLIENT_ID=your_discord_client_id
GUILD_ID=your_discord_guild_id

# Database Configuration
POSTGRES_DB=starbunk
POSTGRES_USER=starbunk
POSTGRES_PASSWORD=your_secure_password
POSTGRES_PORT=5432

# API Keys
OPENAI_API_KEY=your_openai_api_key
OPENAI_DEFAULT_MODEL=gpt-4o-mini

# Optional: Ollama Configuration
OLLAMA_API_URL=http://your-ollama-server:11434
OLLAMA_DEFAULT_MODEL=llama3:8b
```

### 3. Docker Authentication (if images are private)
```bash
docker login ghcr.io -u andrewgari
# Enter your GitHub Personal Access Token when prompted
```

## Deployment Steps

### 1. Quick Start (Recommended)
```bash
# Use the production startup script
./start-production.sh
```

### 2. Manual Deployment
```bash
# Pull latest images
docker-compose pull

# Start services
docker-compose up -d

# Check status
docker-compose ps
```

### 3. Verify Deployment
```bash
# Check all containers are running
docker-compose ps

# View logs
docker-compose logs -f

# Test health endpoints (if available)
curl http://localhost:3000/health  # BunkBot
curl http://localhost:3001/health  # DJCova
curl http://localhost:3002/health  # Starbunk-DND
curl http://localhost:3003/health  # CovaBot
```

## Service Configuration

### BunkBot (Port 3000)
- **Purpose:** Reply bots and admin commands
- **Dependencies:** PostgreSQL, Discord Token
- **Database:** Required for bot state and admin features

### DJCova (Port 3001)
- **Purpose:** Music service
- **Dependencies:** Discord Token only
- **Database:** Not required

### Starbunk-DND (Port 3002)
- **Purpose:** D&D features and Snowbunk bridge
- **Dependencies:** PostgreSQL, Discord Tokens, OpenAI API
- **Database:** Required for campaigns and game state

### CovaBot (Port 3003)
- **Purpose:** AI personality bot
- **Dependencies:** PostgreSQL, Discord Token, OpenAI API
- **Database:** Required for conversation history

## Maintenance

### Update Images
```bash
# Pull latest images and restart
docker-compose pull
docker-compose up -d

# Or use the production script
./start-production.sh
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f bunkbot
```

### Restart Services
```bash
# All services
docker-compose restart

# Specific service
docker-compose restart bunkbot
```

### Backup Database
```bash
# Create database backup
docker-compose exec postgres pg_dump -U starbunk starbunk > backup_$(date +%Y%m%d_%H%M%S).sql
```

## Troubleshooting

### Images Not Found
If you get "manifest unknown" errors:
1. Check if images exist in GHCR
2. Ensure CI/CD has built and published the images
3. Verify authentication if images are private

### Service Won't Start
1. Check logs: `docker-compose logs [service_name]`
2. Verify environment variables
3. Ensure PostgreSQL is healthy for database-dependent services

### Database Connection Issues
1. Check PostgreSQL logs: `docker-compose logs postgres`
2. Verify DATABASE_URL format
3. Ensure PostgreSQL is fully started before dependent services

## Security Considerations

1. **Environment Variables:** Keep `.env` file secure and never commit it
2. **Database Password:** Use a strong, unique password
3. **API Keys:** Rotate API keys regularly
4. **Container Updates:** Keep images updated with security patches
5. **Network:** Consider using Docker networks for isolation

## Monitoring

### Health Checks
All services include health checks that Docker monitors automatically.

### Resource Usage
```bash
# Monitor resource usage
docker stats

# Check specific container
docker stats starbunk-bunkbot
```

### Log Management
Logs are automatically rotated (max 10MB, 3 files) to prevent disk space issues.

## Scaling

For high-traffic deployments, consider:
1. **Load Balancing:** Multiple instances behind a load balancer
2. **Database:** External PostgreSQL cluster
3. **Monitoring:** Prometheus/Grafana for metrics
4. **Orchestration:** Kubernetes for advanced scaling
