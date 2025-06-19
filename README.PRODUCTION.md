# Starbunk Discord Bot - Production Deployment

This repository contains a production-ready Docker Compose configuration for deploying the Starbunk Discord Bot suite using pre-built container images from GitHub Container Registry (GHCR).

## 🚀 Quick Start

1. **Download the deployment files**:
   ```bash
   # Option 1: Clone the repository
   git clone https://github.com/andrewgari/starbunk-js.git
   cd starbunk-js
   
   # Option 2: Download just the production files
   wget https://raw.githubusercontent.com/andrewgari/starbunk-js/main/docker-compose.yml
   wget https://raw.githubusercontent.com/andrewgari/starbunk-js/main/.env.production.example
   ```

2. **Configure environment**:
   ```bash
   cp .env.production.example .env
   # Edit .env with your Discord tokens and API keys
   nano .env
   ```

3. **Deploy**:
   ```bash
   docker-compose pull
   docker-compose up -d
   ```

4. **Verify deployment**:
   ```bash
   docker-compose ps
   docker-compose logs -f
   ```

## 🏗️ Architecture

The deployment consists of 5 containers:

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| **postgres** | `postgres:15-alpine` | 5432 | Shared database |
| **bunkbot** | `ghcr.io/andrewgari/starbunk-bunkbot:latest` | 3000 | Reply bots & admin |
| **djcova** | `ghcr.io/andrewgari/starbunk-djcova:latest` | 3001 | Music service |
| **starbunk-dnd** | `ghcr.io/andrewgari/starbunk-starbunk-dnd:latest` | 3002 | D&D features |
| **covabot** | `ghcr.io/andrewgari/starbunk-covabot:latest` | 3003 | AI personality |

## 🔧 Configuration

### Required Environment Variables

```bash
# Discord Configuration
STARBUNK_TOKEN=your_discord_bot_token
SNOWBUNK_TOKEN=your_secondary_bot_token
CLIENT_ID=your_discord_client_id
GUILD_ID=your_discord_guild_id

# Database
POSTGRES_PASSWORD=your_secure_password

# AI Services
OPENAI_API_KEY=your_openai_api_key
```

### Optional Configuration

```bash
# Service Ports
BUNKBOT_PORT=3000
DJCOVA_PORT=3001
STARBUNK_DND_PORT=3002
COVABOT_PORT=3003

# Database
POSTGRES_DB=starbunk
POSTGRES_USER=starbunk
POSTGRES_PORT=5432

# Logging
LOG_LEVEL=info
DEBUG_MODE=false

# AI Models
OPENAI_DEFAULT_MODEL=gpt-4o-mini
```

## 📊 Resource Requirements

### Minimum System Requirements
- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 10GB free space
- **Network**: Stable internet connection

### Container Resource Limits
- **BunkBot**: 512MB RAM
- **DJCova**: 1GB RAM (audio processing)
- **Starbunk-DND**: 1GB RAM (AI processing)
- **CovaBot**: 512MB RAM
- **PostgreSQL**: Unlimited (uses available resources)

## 🔍 Health Monitoring

### Built-in Health Checks
All services include health checks with automatic restart on failure.

### Manual Health Check
```bash
# Run the health check script
./scripts/health-check.sh

# Or check manually
docker-compose ps
docker-compose logs --tail=50
```

### Service Status
```bash
# View running containers
docker-compose ps

# Check resource usage
docker stats

# View logs
docker-compose logs -f [service_name]
```

## 🔄 Management

### Update Services
```bash
# Pull latest images
docker-compose pull

# Restart with new images
docker-compose up -d
```

### Restart Services
```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart bunkbot
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f bunkbot

# Last 100 lines
docker-compose logs --tail=100
```

## 💾 Data Persistence

### Persistent Volumes
- `postgres_data`: Database files
- `djcova_cache`: Music service cache
- `dnd_data`: D&D campaign data
- `dnd_campaigns`: Campaign files
- `dnd_context`: LLM context data

### Backup
```bash
# Database backup
docker-compose exec postgres pg_dump -U starbunk starbunk > backup.sql

# Volume backup
docker run --rm -v starbunk_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/backup.tar.gz -C /data .
```

### Restore
```bash
# Database restore
docker-compose exec -T postgres psql -U starbunk starbunk < backup.sql
```

## 🔒 Security

### Best Practices
1. **Environment Variables**: Keep `.env` file secure
2. **Passwords**: Use strong, unique passwords
3. **Updates**: Regularly update to latest images
4. **Firewall**: Configure appropriate firewall rules
5. **Backups**: Implement regular backup procedures

### Network Security
- Services communicate via internal Docker network
- Only necessary ports are exposed
- Database is not exposed externally by default

## 🐛 Troubleshooting

### Common Issues

**Services won't start**
```bash
# Check logs
docker-compose logs

# Check environment variables
cat .env

# Verify Discord tokens and permissions
```

**Database connection errors**
```bash
# Check PostgreSQL health
docker-compose exec postgres pg_isready -U starbunk

# Restart database
docker-compose restart postgres
```

**Out of memory errors**
```bash
# Check resource usage
docker stats

# Increase system resources or adjust limits in docker-compose.yml
```

### Debug Mode
```bash
# Enable debug logging
echo "DEBUG_MODE=true" >> .env
echo "LOG_LEVEL=debug" >> .env

# Restart services
docker-compose restart
```

## 📞 Support

- **Documentation**: See `PRODUCTION_DEPLOYMENT.md` for detailed guide
- **Health Check**: Run `./scripts/health-check.sh`
- **Logs**: Always check logs first: `docker-compose logs -f`
- **Repository**: [GitHub Repository](https://github.com/andrewgari/starbunk-js)

## 📄 License

This project is licensed under the terms specified in the main repository.
