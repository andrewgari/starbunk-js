# BunkBot Configuration Migration

This document outlines the migration from hardcoded Discord IDs to a centralized database-driven configuration system.

## Overview

Previously, Discord user IDs, server IDs, and channel IDs were hardcoded throughout the BunkBot reply-bot implementations. This created maintenance issues and made it difficult to manage configurations across different environments.

The new system centralizes all Discord IDs in the PostgreSQL database and provides services to retrieve them dynamically.

## Changes Made

### 1. Database Schema
The existing database schema already included the necessary tables:
- `UserConfiguration` - Stores Discord user IDs and metadata
- `BotConfiguration` - Stores bot settings and configurations  
- `ServerConfiguration` - Stores server-specific settings

### 2. New Services

#### ConfigurationService (`src/services/configurationService.ts`)
- Provides cached access to user, bot, and server configurations
- Handles database queries with fallback error handling
- Implements 5-minute cache expiry for performance

Key methods:
- `getUserConfig(userId: string)` - Get user configuration by Discord ID
- `getUserIdByUsername(username: string)` - Get Discord ID by username
- `getBotConfig(botName: string)` - Get bot configuration
- `getServerConfig(serverId: string)` - Get server configuration
- `refreshCache()` - Force refresh all caches

#### BotIdentityService (`src/services/botIdentityService.ts`)
- Resolves bot identities using the configuration service
- Fetches Discord user data (avatar, display name) dynamically
- Provides convenience methods for common users

Key methods:
- `getBotIdentityByUsername(username: string)` - Get bot identity by username
- `getChadIdentity()` - Get Chad's bot identity
- `getGuyIdentity()` - Get Guy's bot identity  
- `getVennIdentity()` - Get Venn's bot identity
- `getCovaIdentity()` - Get Cova's bot identity

### 3. Updated Reply Bots

The following reply bots have been updated to use the new configuration system:

#### Chad Bot
- **Before**: `const CHAD_USER_ID = '85184539906809856';`
- **After**: Uses `configService.getUserIdByUsername('Chad')` and `identityService.getChadIdentity()`

#### Guy Bot  
- **Before**: `const GUY_USER_ID = '135820819086573568';`
- **After**: Uses `identityService.getGuyIdentity()`

#### Venn Bot
- **Before**: `const VENN_USER_ID = '151120340343455744';`
- **After**: Uses `identityService.getVennIdentity()` and dynamic user ID lookup

#### Banana Bot
- **Before**: Hardcoded user IDs for Cova and Venn
- **After**: Uses `configService.getUserIdByUsername()` with debug mode support

#### Blue Bot
- **Before**: Hardcoded user IDs in constants
- **After**: Uses `configService.getUserIdByUsername()` with debug mode support

#### Macaroni Bot & Cova Bot
- **Before**: Hardcoded user IDs in patterns and responses
- **After**: Updated to use placeholder system for dynamic ID replacement

### 4. Utility Functions

#### Dynamic Patterns (`src/utils/dynamicPatterns.ts`)
Provides utilities for creating dynamic patterns and responses:
- `createDynamicMentionPattern()` - Create mention patterns with dynamic user IDs
- `createDynamicUserCondition()` - Create user-based conditions
- `replacePlaceholdersWithUserIds()` - Replace placeholders like `{CHAD_USER_ID}` with actual IDs
- `createCachedDynamicPattern()` - Create cached patterns for performance

### 5. Database Seeding

Updated `prisma/seed.ts` to include bot configurations for:
- Chad Bot with patterns and responses
- Guy Bot with random response alternatives
- Venn Bot with cringe detection patterns

### 6. Container Integration

Updated `containers/bunkbot/src/index.ts` to:
- Initialize ConfigurationService and BotIdentityService
- Preload configuration cache on startup
- Properly disconnect services on shutdown

## Migration Benefits

1. **Centralized Configuration**: All Discord IDs are now stored in one place
2. **Environment Flexibility**: Easy to switch between development/production user IDs
3. **Dynamic Updates**: Configuration changes don't require code deployment
4. **Better Error Handling**: Graceful fallbacks when users/bots not found
5. **Performance**: Cached lookups reduce database queries
6. **Maintainability**: No more scattered hardcoded IDs throughout the codebase

## Usage Examples

### Getting a User ID
```typescript
const configService = new ConfigurationService();
const chadUserId = await configService.getUserIdByUsername('Chad');
```

### Getting Bot Identity
```typescript
const identityService = new BotIdentityService(configService);
const chadIdentity = await identityService.getChadIdentity();
// Returns: { botName: 'ChadBot', avatarUrl: 'https://...' }
```

### Creating Dynamic Conditions
```typescript
// Old way
condition: and(not(fromUser(CHAD_USER_ID)), withChance(1))

// New way  
condition: async (message) => {
    const chadUserId = await getChadUserId();
    if (!chadUserId) return false;
    
    const notFromChad = not(fromUser(chadUserId));
    const chanceCheck = withChance(1);
    return and(notFromChad, chanceCheck)(message);
}
```

## Testing

Run the test suite to verify the configuration system:
```bash
npm test -- containers/bunkbot/src/services/__tests__/
```

Run the migration verification script:
```bash
npx ts-node containers/bunkbot/scripts/migrate-hardcoded-ids.ts
```

## Rollback Plan

If issues arise, the old hardcoded values can be temporarily restored by:
1. Reverting the trigger files to use hardcoded constants
2. Commenting out the configuration service initialization
3. Re-enabling the deprecated ID files in `containers/shared/src/discord/`

## Next Steps

1. **Test thoroughly** - Verify all reply bots work correctly with new system
2. **Monitor performance** - Check that caching is working effectively  
3. **Update documentation** - Document any new bot configuration procedures
4. **Clean up deprecated files** - Remove old hardcoded ID files once stable
5. **Extend to other containers** - Apply similar patterns to DJCova, Starbunk-DND, etc.

## Troubleshooting

### Common Issues

1. **User not found errors**: Check that user is seeded in `UserConfiguration` table
2. **Cache misses**: Verify `refreshCache()` is called during initialization
3. **Database connection errors**: Ensure `DATABASE_URL` is properly configured
4. **Identity resolution failures**: Check Discord API permissions and rate limits

### Debug Commands

```typescript
// Check if user exists in database
const user = await configService.getUserConfig('85184539906809856');

// Force cache refresh
await configService.refreshCache();

// Test identity resolution
const identity = await identityService.getChadIdentity();
```
