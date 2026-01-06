# BlueBot: PostgreSQL → Redis Migration

## Summary

BlueBot has been migrated from PostgreSQL to Redis for user configuration lookups. This provides a simpler, faster, and more lightweight solution.

## What Changed

### Before (PostgreSQL)
- ❌ Required PostgreSQL database running
- ❌ Used Prisma ORM with complex schema
- ❌ Heavy resource usage
- ❌ Database connection errors when PostgreSQL unavailable

### After (Redis)
- ✅ Uses lightweight Redis key-value store
- ✅ Simple username → userId mappings
- ✅ Much lower resource usage (~128-256MB vs 512MB+)
- ✅ Faster lookups (in-memory)
- ✅ Easier to manage and debug

## Quick Start

### 1. Start Redis

```bash
# Start Redis service
docker-compose up -d redis

# Verify it's running
docker-compose ps redis
docker-compose logs redis
```

### 2. Configure User IDs

Edit your `.env` file and add Discord user IDs:

```bash
# User IDs for Redis seeding
VENN_USER_ID=123456789012345678
GUY_USER_ID=234567890123456789
CHAD_USER_ID=345678901234567890
SIGGREAT_USER_ID=456789012345678901
```

**How to get Discord User IDs:**
1. Enable Developer Mode in Discord (Settings → Advanced → Developer Mode)
2. Right-click on a user → Copy User ID

### 3. Seed User Data

```bash
# Populate Redis with user mappings
npm run redis:seed
```

Expected output:
```
✅ Connected to Redis
✅ Set Cova -> 139592376443338752
✅ Set Venn -> 123456789012345678
✅ Set Guy -> 234567890123456789
...
✅ Redis seeding complete!
```

### 4. Start BlueBot

```bash
# Start BlueBot (it will now use Redis)
docker-compose up -d bluebot

# Check logs
docker-compose logs -f bluebot
```

You should see:
```
[RedisConfig] Connected to Redis
[RedisConfig] Redis connection ready
[BlueBot] Ready! Logged in as BlueBot#1234
```

## Files Changed

### New Files
- `apps/bluebot/src/services/redisConfigurationService.ts` - Redis-based config service
- `scripts/seed-redis-users.ts` - Script to populate Redis with user data
- `apps/bluebot/REDIS_SETUP.md` - Detailed Redis setup documentation

### Modified Files
- `docker-compose.yml` - Added Redis service, updated BlueBot to use Redis
- `apps/bluebot/src/triggers.ts` - Uses RedisConfigurationService instead of ConfigurationService
- `apps/bluebot/src/index-minimal.ts` - Updated environment validation
- `.env` - Added Redis configuration variables
- `package.json` - Added `redis:seed` script

### Deprecated Files (can be removed later)
- `apps/bluebot/src/services/configurationService.ts` - Old Prisma-based service

## Environment Variables

### Required for Docker
```bash
REDIS_HOST=redis          # Docker service name
REDIS_PORT=6379
REDIS_PASSWORD=           # Optional
REDIS_DB=0
```

### Required for Local Development
```bash
REDIS_HOST=192.168.50.3   # Or localhost
REDIS_PORT=6379
REDIS_PASSWORD=           # Optional
REDIS_DB=0
```

## Troubleshooting

### Error: "Can't reach Redis server"

**Solution:**
```bash
# Check if Redis is running
docker-compose ps redis

# If not running, start it
docker-compose up -d redis

# Check logs
docker-compose logs redis
```

### Error: "Failed to get user ID for username Venn"

**Solution:**
```bash
# Check if user exists in Redis
docker exec -it starbunk-redis redis-cli GET user:username:venn

# If empty, re-seed
npm run redis:seed
```

### Manual Redis Management

```bash
# Connect to Redis CLI
docker exec -it starbunk-redis redis-cli

# List all users
KEYS user:username:*

# Get a specific user
GET user:username:venn

# Set a user manually
SET user:username:venn "123456789012345678"

# Delete a user
DEL user:username:venn
```

## Benefits

1. **Simpler**: No database migrations, schemas, or ORM complexity
2. **Faster**: In-memory lookups are extremely fast
3. **Lighter**: Redis uses ~128-256MB vs PostgreSQL's 512MB+
4. **Easier to debug**: Simple key-value pairs, easy to inspect
5. **Better for this use case**: BlueBot only needs simple username lookups

## Next Steps

- ✅ Redis is now running
- ✅ User data is seeded
- ✅ BlueBot is using Redis
- 🔄 Monitor logs to ensure everything works
- 🔄 Add more users as needed via `npm run redis:seed`

## Rollback (if needed)

If you need to rollback to PostgreSQL:

1. Start PostgreSQL: `docker-compose up -d postgres`
2. Revert `apps/bluebot/src/triggers.ts` to use `ConfigurationService`
3. Update `docker-compose.yml` bluebot service to depend on `postgres` instead of `redis`
4. Restart BlueBot: `docker-compose restart bluebot`

