# Docker Container Troubleshooting Guide

## Issues You Were Experiencing

### 1. Missing POSTGRES_PASSWORD
**Error:** `The "POSTGRES_PASSWORD" variable is not set. Defaulting to a blank string.`

**Solution:** ✅ **FIXED** - Added PostgreSQL configuration to `.env` file:
```bash
POSTGRES_DB=starbunk
POSTGRES_USER=starbunk
POSTGRES_PASSWORD=kyraiskewl
POSTGRES_PORT=5432
```

### 2. Production Setup with GHCR Images
**Configuration:** ✅ **CONFIGURED** - Set up for production deployment:
- Uses `image: ghcr.io/andrewgari/starbunk/*:latest` for all services
- Pulls pre-built images from GitHub Container Registry
- Requires images to be built and published via CI/CD first

## Quick Start

### Production (GHCR Images)
1. **Start production containers:**
   ```bash
   ./start-production.sh
   ```

### Development (Local Build)
1. **Start development containers:**
   ```bash
   ./start-containers.sh
   # OR
   docker-compose -f docker-compose.dev.yml up -d
   ```

### General Commands
2. **Check status:**
   ```bash
   docker-compose ps
   ```

3. **View logs:**
   ```bash
   docker-compose logs -f [service_name]
   ```

## Common Issues & Solutions

### Container Build Failures

**Issue:** Container fails to build
```bash
# Check build logs
docker-compose build [service_name] --no-cache

# View detailed logs
docker-compose up [service_name] --build
```

### Database Connection Issues

**Issue:** Services can't connect to PostgreSQL
```bash
# Check PostgreSQL status
docker-compose exec postgres pg_isready -U starbunk

# View PostgreSQL logs
docker-compose logs postgres

# Reset database
docker-compose down -v
docker-compose up -d postgres
```

### Environment Variable Issues

**Issue:** Missing or incorrect environment variables
```bash
# Check current environment
docker-compose config

# Validate .env file
source .env && echo "STARBUNK_TOKEN: ${STARBUNK_TOKEN:0:10}..."
```

### GitHub Container Registry Issues

**Issue:** Cannot pull images from GHCR
```bash
# Authenticate with GHCR
docker login ghcr.io -u andrewgari

# Check if images exist
docker pull ghcr.io/andrewgari/starbunk/bunkbot:latest

# List available tags (requires GitHub CLI)
gh api /user/packages/container/starbunk%2Fbunkbot/versions
```

**Issue:** Images don't exist in registry
```bash
# Trigger CI/CD to build and publish images
# Push to main branch or manually trigger workflow
git push origin main

# Or manually trigger via GitHub Actions
gh workflow run "Docker Build and Publish"
```

### Port Conflicts

**Issue:** Port already in use
```bash
# Check what's using the port
sudo netstat -tulpn | grep :3000

# Change ports in docker-compose.yml or .env
BUNKBOT_PORT=3010
DJCOVA_PORT=3011
```

## Service-Specific Troubleshooting

### BunkBot
- **Port:** 3000
- **Health Check:** `curl http://localhost:3000/health`
- **Dependencies:** PostgreSQL, Discord Token

### DJCova
- **Port:** 3001
- **Health Check:** `curl http://localhost:3001/health`
- **Dependencies:** Discord Token only

### Starbunk-DND
- **Port:** 3002
- **Health Check:** `curl http://localhost:3002/health`
- **Dependencies:** PostgreSQL, Discord Token, OpenAI API Key

### CovaBot
- **Port:** 3003
- **Health Check:** `curl http://localhost:3003/health`
- **Dependencies:** PostgreSQL, Discord Token, OpenAI API Key

## Development vs Production

### Production (GHCR Images) - Current Setup
```bash
# Production setup - pulls from GitHub Container Registry
./start-production.sh
# OR
docker-compose up -d
```

**Prerequisites:**
- Images must be built and published to GHCR via CI/CD
- Docker must be authenticated with GHCR if images are private
- All environment variables must be properly configured

### Development (Local Build)
```bash
# Development setup - builds locally
docker-compose -f docker-compose.dev.yml up -d
```

## Useful Commands

```bash
# Full restart
docker-compose down && docker-compose up -d

# Rebuild specific service
docker-compose build [service] --no-cache

# View all logs
docker-compose logs -f

# Clean up everything
docker-compose down -v --remove-orphans
docker system prune -f

# Check resource usage
docker stats

# Access container shell
docker-compose exec [service] /bin/bash
```

## Next Steps

1. **Test the containers** with `./start-containers.sh`
2. **Set up CI/CD** to publish images to GitHub Container Registry
3. **Switch to registry images** once they're published
4. **Monitor logs** for any runtime issues
