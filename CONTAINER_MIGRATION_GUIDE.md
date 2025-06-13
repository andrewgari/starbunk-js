# Container Migration Guide

## Overview

This guide explains the migration from the monolithic Starbunk-JS Discord bot to a 4-container modular architecture.

## What Changed

### Before (Monolithic)
- Single application handling all features
- All dependencies bundled together
- Single point of failure
- Difficult to scale individual features
- Complex deployment process

### After (Containerized)
- 4 separate containers with specific responsibilities
- Isolated dependencies per container
- Independent scaling and deployment
- Better error isolation
- Simplified maintenance

## Container Breakdown

### 1. BunkBot Container
**What moved here:**
- All reply bots from `src/starbunk/bots/reply-bots/` (except AI Cova)
- Admin commands: `botCommandHandler.ts`, `ping.ts`, `debug.ts`, `clearWebhooks.ts`
- Bot registry and management system

**Dependencies reduced to:**
- Basic Discord.js features
- Prisma for database access
- Webhook services

### 2. DJCova Container
**What moved here:**
- Music player: `src/starbunk/djCova.ts`
- Music commands: `play.ts`, `stop.ts`, `setVolume.ts`
- Voice bot functionality

**Dependencies reduced to:**
- Discord.js Voice
- Audio processing libraries (ffmpeg, ytdl-core)
- No database access needed

### 3. Starbunk-DND Container
**What moved here:**
- D&D commands: `rpg.ts`, `rpghelp.ts`
- Campaign services from `src/starbunk/services/`
- Vector embedding services
- Snowbunk bridge from `src/snowbunk/`

**Dependencies include:**
- Full LLM stack (OpenAI, Transformers)
- Database access for campaigns
- File processing capabilities

### 4. CovaBot Container
**What moved here:**
- AI Cova bot from `src/starbunk/bots/reply-bots/cova-bot/`
- LLM personality features

**Dependencies reduced to:**
- LLM services (OpenAI)
- Basic database access
- No music or D&D features

## Migration Steps

### 1. Preparation
```bash
# Run the migration script
./scripts/migrate-to-containers.sh
```

### 2. Environment Setup
Update your `.env` file to ensure all required variables are present:
```env
# Required for all containers
STARBUNK_TOKEN=your_starbunk_token
NODE_ENV=production
DEBUG=false

# Required for database-dependent containers
DATABASE_URL=postgresql://user:pass@postgres:5432/starbunk

# Required for LLM-dependent containers
OPENAI_API_KEY=your_openai_key
OLLAMA_API_URL=http://ollama:11434

# Required for Starbunk-DND
SNOWBUNK_TOKEN=your_snowbunk_token
VECTOR_CONTEXT_DIR=/app/data/vectors
```

### 3. Start New Architecture
```bash
# Production
docker-compose -f docker-compose.new.yml up -d

# Development
docker-compose -f docker-compose.dev.yml up -d
```

### 4. Verify Migration
```bash
# Check all containers are running
docker-compose -f docker-compose.new.yml ps

# Check logs for any errors
docker-compose -f docker-compose.new.yml logs -f
```

## Key Benefits

### 1. **Resource Optimization**
- **BunkBot**: Lightweight, only needs basic Discord features
- **DJCova**: Optimized for audio processing with ffmpeg
- **Starbunk-DND**: Full-featured with LLM and database access
- **CovaBot**: Focused on AI personality features

### 2. **Independent Scaling**
```bash
# Scale only the music service if needed
docker-compose -f docker-compose.new.yml up -d --scale djcova=3

# Scale reply bots for high message volume
docker-compose -f docker-compose.new.yml up -d --scale bunkbot=2
```

### 3. **Isolated Failures**
- If music service fails, reply bots continue working
- If D&D features crash, other services remain operational
- Database issues only affect containers that need database access

### 4. **Simplified Development**
```bash
# Work on just reply bots
npm run dev:bunkbot

# Focus on music features
npm run dev:djcova

# Develop D&D features in isolation
npm run dev:starbunk-dnd
```

## Troubleshooting

### Container Won't Start
1. Check logs: `docker-compose logs <container-name>`
2. Verify environment variables are set
3. Ensure dependencies are installed: `npm run setup:containers`

### Database Connection Issues
1. Ensure PostgreSQL container is healthy
2. Check `DATABASE_URL` format
3. Verify network connectivity between containers

### Missing Dependencies
1. Run `npm run setup:containers` to install all dependencies
2. Rebuild containers: `docker-compose build --no-cache`

### Port Conflicts
The new architecture uses different ports:
- PostgreSQL: 5432 (production) / 5433 (development)
- BunkBot: 3000
- DJCova: 3001
- Starbunk-DND: 3002
- CovaBot: 3003

## Rollback Plan

If you need to rollback to the monolithic architecture:

1. Stop new containers:
   ```bash
   docker-compose -f docker-compose.new.yml down
   ```

2. Restore backup:
   ```bash
   cp backup/docker-compose.yml.backup.* docker-compose.yml
   cp backup/.env.backup.* .env
   ```

3. Start original architecture:
   ```bash
   docker-compose up -d
   ```

## Performance Monitoring

Monitor each container's resource usage:
```bash
# Overall stats
docker stats

# Specific container logs
docker-compose -f docker-compose.new.yml logs -f bunkbot
docker-compose -f docker-compose.new.yml logs -f djcova
docker-compose -f docker-compose.new.yml logs -f starbunk-dnd
docker-compose -f docker-compose.new.yml logs -f covabot
```

## Next Steps

1. **Test thoroughly** - Verify all features work as expected
2. **Monitor performance** - Check resource usage and response times
3. **Update CI/CD** - Modify deployment pipelines for container architecture
4. **Documentation** - Update team documentation with new architecture
5. **Training** - Ensure team understands new development workflow

## Support

For issues with the migration:
1. Check `ARCHITECTURE.md` for detailed technical information
2. Review container logs for specific error messages
3. Verify environment configuration matches requirements
4. Test individual containers in isolation
