# BlueBot Redis Configuration

BlueBot now uses **Redis** instead of PostgreSQL for user configuration lookups. This provides a simpler, faster, and more lightweight solution.

## Why Redis?

- ✅ **Simpler**: No complex database schema or migrations
- ✅ **Faster**: In-memory key-value lookups are extremely fast
- ✅ **Lightweight**: Much lower resource usage than PostgreSQL
- ✅ **Perfect for this use case**: BlueBot only needs simple username → userId lookups

## Setup

### 1. Start Redis

**Using Docker Compose (Recommended):**
```bash
# Start Redis service
docker-compose up -d redis

# Verify Redis is running
docker-compose ps redis
```

**Using standalone Redis:**
```bash
# If you have Redis installed locally
redis-server
```

### 2. Configure Environment Variables

Add these to your `.env` file:

```bash
# For Docker: use redis:6379 (service name)
# For local development: use 192.168.50.3:6379 or localhost:6379
REDIS_HOST=192.168.50.3
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# User IDs for seeding (get these from Discord)
VENN_USER_ID=your-venn-discord-id
GUY_USER_ID=your-guy-discord-id
CHAD_USER_ID=your-chad-discord-id
SIGGREAT_USER_ID=your-siggreat-discord-id
```

### 3. Seed User Data

Populate Redis with user mappings:

```bash
# Run the seed script
npm run redis:seed
```

This will create entries like:
- `user:username:venn` → `<Discord User ID>`
- `user:username:cova` → `139592376443338752`
- etc.

### 4. Start BlueBot

```bash
# Using Docker Compose
docker-compose up -d bluebot

# Or for development
npm run dev:bluebot
```

## Manual Redis Operations

You can manually manage user data using `redis-cli`:

```bash
# Connect to Redis
redis-cli -h 192.168.50.3 -p 6379

# Set a user mapping
SET user:username:venn "123456789012345678"

# Get a user ID
GET user:username:venn

# List all user keys
KEYS user:username:*

# Delete a user
DEL user:username:venn
```

## How It Works

BlueBot uses the `RedisConfigurationService` which:

1. Connects to Redis on startup (lazy initialization)
2. Normalizes usernames to lowercase for case-insensitive lookups
3. Stores mappings as `user:username:<username>` → `<userId>`
4. Returns `null` if a user is not found (graceful degradation)

## Troubleshooting

### Redis connection errors

If you see errors like "Can't reach Redis server":

1. **Check Redis is running:**
   ```bash
   docker-compose ps redis
   # or
   redis-cli -h 192.168.50.3 ping
   ```

2. **Check environment variables:**
   ```bash
   echo $REDIS_HOST
   echo $REDIS_PORT
   ```

3. **Check Docker networking:**
   ```bash
   docker-compose logs redis
   ```

### User not found

If BlueBot can't find a user:

1. **Check if the user exists in Redis:**
   ```bash
   redis-cli -h 192.168.50.3 GET user:username:venn
   ```

2. **Re-run the seed script:**
   ```bash
   npm run redis:seed
   ```

3. **Manually add the user:**
   ```bash
   redis-cli -h 192.168.50.3 SET user:username:venn "123456789012345678"
   ```

## Migration from PostgreSQL

If you were previously using PostgreSQL, you can export user data:

```bash
# Export from PostgreSQL
psql -h 192.168.50.3 -U andrewgari -d starbunk -c \
  "SELECT username, \"userId\" FROM \"UserConfiguration\"" -t -A -F ','

# Then manually add to Redis or update the seed script
```

