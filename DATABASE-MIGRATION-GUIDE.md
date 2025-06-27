# PostgreSQL Database-Driven Configuration System

This guide explains the implementation of the PostgreSQL database-driven configuration system for Discord bot containers, replacing hardcoded values with centralized database storage.

## Overview

The system has been migrated from hardcoded configuration values to a PostgreSQL database-driven approach with the following benefits:

- **Centralized Configuration**: All bot settings, user IDs, and server configurations stored in PostgreSQL
- **Dynamic Updates**: Configuration changes without code deployment
- **Scalability**: Easy to add new bots and modify existing ones
- **Fallback Support**: Graceful degradation to hardcoded values if database is unavailable
- **Caching**: Performance optimization with intelligent caching

## Architecture Changes

### Database Schema

New tables added to support configuration:

- **`BotConfiguration`**: Bot metadata (name, description, avatar, priority)
- **`BotPattern`**: Regex patterns for message matching
- **`BotResponse`**: Response configurations (static, random, LLM, function)
- **`UserConfiguration`**: User IDs and metadata (replaces hardcoded userId.ts)
- **`ServerConfiguration`**: Server-specific settings

### Services Added

- **`DatabaseService`**: PostgreSQL connection management with retry logic
- **`ConfigurationRepository`**: Data access layer with caching
- **`ConfigurationService`**: High-level configuration API with fallbacks
- **`UserService`**: User ID resolution and management
- **`DatabaseBotFactory`**: Creates reply bots from database configuration

## Migration Steps

### 1. Database Setup

```bash
# Install dependencies
npm install

# Run database migration (creates schema and seeds data)
npm run db:migrate

# Or run steps manually:
npm run db:generate  # Generate Prisma client
npm run db:push      # Apply schema changes
npm run db:seed      # Seed initial data
```

### 2. Environment Configuration

Ensure your `.env` file has the PostgreSQL connection:

```env
DATABASE_URL="postgresql://user:password@host:port/database"
POSTGRES_DB=starbunk
POSTGRES_USER=starbunk
POSTGRES_PASSWORD=your_password
```

### 3. Container Updates

All containers now support database-driven configuration:

- **BunkBot**: Loads reply bots from database, falls back to file-based discovery
- **CovaBot**: Uses database for user ID resolution
- **Starbunk-DND**: Database connection for persistence
- **DJCova**: Ready for future database features

## Testing

### 1. Database Migration Test

```bash
# Test database connection and seeding
npm run db:migrate
```

### 2. Reply Bot Testing

```bash
# Test all reply bots with simulated messages
npm run test:bots
```

### 3. Container Testing

```bash
# Start snapshot stack with PostgreSQL
docker-compose -f docker-compose.snapshot.yml up

# Check logs for successful database connections
docker-compose -f docker-compose.snapshot.yml logs bunkbot
```

## Configuration Management

### Adding New Bots

1. **Database Approach** (Recommended):
```sql
-- Add bot configuration
INSERT INTO "BotConfiguration" (id, "botName", "displayName", description, "isEnabled", priority)
VALUES (gen_random_uuid(), 'my-new-bot', 'My New Bot', 'Description', true, 1);

-- Add patterns
INSERT INTO "BotPattern" ("botConfigId", name, pattern, "patternFlags", "isEnabled", priority)
VALUES ('bot-config-id', 'default', '\\bhello\\b', 'i', true, 1);

-- Add responses
INSERT INTO "BotResponse" ("botConfigId", name, "responseType", content, "isEnabled", priority)
VALUES ('bot-config-id', 'default', 'static', 'Hello there!', true, 1);
```

2. **File-based Approach** (Fallback):
   - Create bot files in `containers/bunkbot/src/reply-bots/`
   - Follow existing patterns (nice-bot, cova-bot examples)

### Updating Existing Bots

```sql
-- Disable a bot
UPDATE "BotConfiguration" SET "isEnabled" = false WHERE "botName" = 'bot-name';

-- Update response
UPDATE "BotResponse" SET content = 'New response!' WHERE "botConfigId" = 'id' AND name = 'default';

-- Clear cache to apply changes immediately
-- (Or restart containers)
```

### User Management

```sql
-- Add new user
INSERT INTO "UserConfiguration" (id, "userId", username, "displayName", "isActive")
VALUES (gen_random_uuid(), '123456789012345678', 'username', 'Display Name', true);

-- Update user
UPDATE "UserConfiguration" SET "displayName" = 'New Name' WHERE "userId" = '123456789012345678';
```

## Troubleshooting

### Database Connection Issues

1. **Check DATABASE_URL**: Ensure correct PostgreSQL connection string
2. **Network Access**: Verify PostgreSQL is accessible from containers
3. **Credentials**: Confirm username/password are correct
4. **Database Exists**: Ensure target database is created

### Bot Not Responding

1. **Check Database**: Verify bot configuration exists and is enabled
2. **Check Patterns**: Ensure regex patterns are valid
3. **Check Responses**: Verify response configuration is complete
4. **Check Logs**: Look for database connection errors
5. **Clear Cache**: Restart containers to clear configuration cache

### Fallback Behavior

If database is unavailable:
- BunkBot falls back to file-based bot discovery
- User service falls back to hardcoded user IDs
- System continues operating with reduced functionality

## Performance Considerations

- **Caching**: Configuration cached for 5 minutes by default
- **Connection Pooling**: PostgreSQL connections managed efficiently
- **Lazy Loading**: Database connections established only when needed
- **Graceful Degradation**: System works without database (limited functionality)

## Security Notes

- Database credentials stored in environment variables
- No sensitive data in configuration tables
- User IDs are Discord public identifiers
- Bot tokens remain in environment variables (not in database)

## Future Enhancements

- Web interface for configuration management
- Real-time configuration updates via webhooks
- Advanced bot scheduling and conditional logic
- Analytics and usage tracking
- Configuration versioning and rollback

## Support

For issues with the database migration:

1. Check container logs: `docker-compose logs bunkbot`
2. Verify database connectivity: `npm run db:migrate`
3. Test reply bots: `npm run test:bots`
4. Review this guide and troubleshooting section

The system is designed to be robust and maintain backward compatibility while providing enhanced flexibility through database-driven configuration.
