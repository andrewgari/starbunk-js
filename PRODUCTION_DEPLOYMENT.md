# Production Deployment Guide

This guide covers deploying the Starbunk Discord Bot suite using Docker Compose with pre-built images from GitHub Container Registry (GHCR).

## Overview

The production deployment consists of 5 containers:
- **PostgreSQL**: Shared database for persistent data
- **BunkBot**: Reply bots and admin commands (port 3000)
- **DJCova**: Music service with voice capabilities (port 3001)
- **Starbunk-DND**: D&D features and bridge functionality (port 3002)
- **CovaBot**: AI personality bot (port 3003)

## Prerequisites

- Docker and Docker Compose installed
- Access to Discord Developer Portal for bot tokens
- OpenAI API key (for AI features)
- Server with adequate resources (minimum 4GB RAM recommended)

## Quick Start

1. **Clone the repository** (or download just the docker-compose.yml):
   ```bash
   git clone https://github.com/andrewgari/starbunk-js.git
   cd starbunk-js
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.production.example .env
   # Edit .env with your actual values
   nano .env
   ```

3. **Pull the latest images**:
   ```bash
   docker-compose pull
   ```

4. **Start the services**:
   ```bash
   docker-compose up -d
   ```

5. **Check the logs**:
   ```bash
   docker-compose logs -f
   ```

## Environment Configuration

### Required Variables

```bash
# Discord Configuration
STARBUNK_TOKEN=your_discord_bot_token
SNOWBUNK_TOKEN=your_secondary_bot_token  # For D&D bridge
CLIENT_ID=your_discord_client_id
GUILD_ID=your_discord_guild_id

# Database
POSTGRES_PASSWORD=your_secure_password

# AI Services
OPENAI_API_KEY=your_openai_api_key
```

### Optional Variables

```bash
# Service Ports (defaults: 3000, 3001, 3002, 3003)
BUNKBOT_PORT=3000
DJCOVA_PORT=3001
STARBUNK_DND_PORT=3002
COVABOT_PORT=3003

# Database Configuration
POSTGRES_DB=starbunk
POSTGRES_USER=starbunk
POSTGRES_PORT=5432

# Logging
LOG_LEVEL=info
DEBUG_MODE=false

# AI Configuration
OPENAI_DEFAULT_MODEL=gpt-4o-mini
OLLAMA_API_URL=http://localhost:11434
OLLAMA_DEFAULT_MODEL=llama3
```

## Service Dependencies

- **BunkBot**: Requires PostgreSQL, Discord token
- **DJCova**: Requires Discord token only (no database)
- **Starbunk-DND**: Requires PostgreSQL, Discord tokens, OpenAI API
- **CovaBot**: Requires PostgreSQL, Discord token, OpenAI API

## Health Checks

All services include health checks:
- **Database**: PostgreSQL ready check
- **Bot Services**: HTTP health endpoint checks
- **Startup Period**: 60 seconds grace period for bot services

## Resource Limits

Default resource allocations:
- **PostgreSQL**: No limits (uses available resources)
- **BunkBot**: 512MB RAM limit, 256MB reserved
- **DJCova**: 1GB RAM limit, 512MB reserved (audio processing)
- **Starbunk-DND**: 1GB RAM limit, 512MB reserved (AI processing)
- **CovaBot**: 512MB RAM limit, 256MB reserved

## Persistent Data

The following volumes persist data across container restarts:
- `postgres_data`: Database files
- `djcova_cache`: Music service cache
- `dnd_data`: D&D campaign data
- `dnd_campaigns`: Campaign files
- `dnd_context`: LLM context data

## Networking

Services communicate via the `starbunk-network` bridge network (172.20.0.0/16).

## Management Commands

### View logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f bunkbot
```

### Restart services
```bash
# All services
docker-compose restart

# Specific service
docker-compose restart bunkbot
```

### Update to latest images
```bash
docker-compose pull
docker-compose up -d
```

### Stop services
```bash
docker-compose down
```

### Stop and remove volumes (⚠️ DATA LOSS)
```bash
docker-compose down -v
```

## Backup and Recovery

### Database Backup
```bash
# Create backup
docker-compose exec postgres pg_dump -U starbunk starbunk > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
docker-compose exec -T postgres psql -U starbunk starbunk < backup_file.sql
```

### Volume Backup
```bash
# Backup all volumes
docker run --rm \
  -v starbunk_postgres_data:/data/postgres \
  -v starbunk_dnd_data:/data/dnd \
  -v starbunk_dnd_campaigns:/data/campaigns \
  -v $(pwd):/backup \
  alpine tar czf /backup/volumes_backup_$(date +%Y%m%d_%H%M%S).tar.gz -C /data .
```

## Monitoring

### Check service status
```bash
docker-compose ps
```

### Monitor resource usage
```bash
docker stats
```

### View health check status
```bash
docker-compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
```

## Troubleshooting

### Common Issues

1. **Services fail to start**: Check environment variables and logs
2. **Database connection errors**: Ensure PostgreSQL is healthy
3. **Discord connection issues**: Verify bot tokens and permissions
4. **Out of memory errors**: Increase resource limits or server capacity

### Debug Mode

Enable debug logging:
```bash
# In .env file
DEBUG_MODE=true
LOG_LEVEL=debug

# Restart services
docker-compose restart
```

## Security Considerations

1. **Environment Variables**: Keep `.env` file secure, never commit to version control
2. **Network Access**: Consider firewall rules for exposed ports
3. **Updates**: Regularly update to latest images for security patches
4. **Secrets**: Consider using Docker secrets for sensitive data in production
5. **Backups**: Implement regular backup procedures for persistent data

## Support

For issues and support:
- Check logs first: `docker-compose logs -f`
- Review environment configuration
- Consult the main repository documentation
- Check Discord bot permissions and server settings
