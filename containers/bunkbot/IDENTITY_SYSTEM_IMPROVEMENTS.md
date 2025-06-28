# Discord Bot Identity System - Reliability Improvements

## Overview

This document outlines the improvements made to the Discord bot identity system to address reliability concerns and ensure server-specific user identity resolution.

## Key Improvements

### 1. **Server-Specific Identity Resolution**

**Problem**: Previous system used global Discord user data instead of server-specific nicknames and avatars.

**Solution**: 
- All identity resolution now uses `GuildMember` objects which contain server-specific data
- Priority order for display names: Server nickname → Global display name → Username → Fallback
- Priority order for avatars: Server avatar → Global avatar → Default avatar

**Code Example**:
```typescript
// Old way (global data)
const identity = await getBotIdentityFromDiscord({ userId, fallbackName });

// New way (server-specific data)
const identity = await identityService.getChadIdentity(message);
```

### 2. **Message Context Integration**

**Problem**: Identity resolution had no knowledge of which server the message came from.

**Solution**:
- All identity methods now accept an optional `Message` parameter
- Server context is extracted from `message.guild.id`
- Cache keys include guild ID for server-specific caching

**Implementation**:
```typescript
async getChadIdentity(message?: Message, forceRefresh: boolean = false): Promise<BotIdentity> {
    return this.getBotIdentityByUsername('Chad', message, 'ChadBot', forceRefresh);
}
```

### 3. **Improved Caching Strategy**

**Problem**: Cache didn't account for different servers (same user, different nicknames/avatars per server).

**Solution**:
- Cache keys now include guild ID: `"userId:123456:guildId789"`
- Reduced cache expiry from 10 minutes to 5 minutes for fresher data
- Added cache management methods for monitoring and cleanup

**Cache Key Format**:
- Username lookup: `"username:chad:guildId789"`
- User ID lookup: `"userId:123456:guildId789"`

### 4. **Real-time Data Accuracy**

**Problem**: Cached data could become stale when users change nicknames or avatars.

**Solution**:
- Added `forceRefresh` parameter to bypass cache and fetch fresh data
- Automatic cache expiry and cleanup
- Better error handling with fallbacks

**Usage**:
```typescript
// Get cached identity (if available)
const identity = await identityService.getChadIdentity(message);

// Force fresh data from Discord API
const freshIdentity = await identityService.getChadIdentity(message, true);
```

### 5. **Enhanced Error Handling**

**Problem**: System could fail silently or return invalid data.

**Solution**:
- Comprehensive validation of Discord API responses
- Graceful fallbacks when users leave servers or data is unavailable
- Detailed logging for debugging and monitoring

**Error Handling Flow**:
1. Try server-specific identity resolution
2. Fall back to global identity resolution
3. Fall back to configured fallback name/avatar
4. Log errors for monitoring

## Technical Implementation

### Database Configuration

User IDs are stored in the `UserConfiguration` table:
```sql
SELECT userId, username, displayName, isActive 
FROM UserConfiguration 
WHERE username = 'Chad' AND isActive = true;
```

### Server-Specific Identity Resolution

```typescript
private async getServerSpecificIdentity(
    userId: string, 
    guildId: string, 
    fallbackName: string,
    forceRefresh: boolean = false
): Promise<BotIdentity> {
    const member = await discordService.getMemberAsync(guildId, userId);
    
    // Server-specific nickname (priority order)
    const botName = member.nickname || 
                    member.user.globalName || 
                    member.user.username || 
                    fallbackName;
    
    // Server-specific avatar (priority order)
    const avatarUrl = member.displayAvatarURL({ size: 256, extension: 'png' }) || 
                      member.user.displayAvatarURL({ size: 256, extension: 'png' });
    
    return { botName, avatarUrl };
}
```

### Cache Management

```typescript
// Cache with server context
private cacheIdentity(cacheKey: string, identity: BotIdentity): void {
    this.identityCache.set(cacheKey, identity);
    this.lastCacheUpdate.set(cacheKey, Date.now());
    
    // Auto-cleanup after expiry
    setTimeout(() => {
        this.identityCache.delete(cacheKey);
        this.lastCacheUpdate.delete(cacheKey);
    }, this.cacheExpiry);
}
```

## Usage Examples

### Basic Usage (Server-Aware)
```typescript
// In reply bot triggers
export const chadKeywordTrigger = createTriggerResponse({
    name: 'chad-keyword-trigger',
    condition: async (message) => {
        const chadUserId = await getChadUserId();
        return chadUserId && !fromUser(chadUserId)(message) && withChance(1)(message);
    },
    response: () => CHAD_RESPONSE,
    identity: async (message) => getChadIdentity(message), // Server-specific!
    priority: 1
});
```

### Force Refresh for Real-time Data
```typescript
// When you need the most current data (e.g., after user changes nickname)
const currentIdentity = await identityService.getChadIdentity(message, true);
```

### Cache Management
```typescript
// Clear cache for a specific user across all servers
identityService.clearUserCache('85184539906809856');

// Get cache statistics
const stats = identityService.getCacheStats();
console.log(`Cache size: ${stats.size}, Keys: ${stats.keys}`);
```

## Benefits

1. **Reliability**: Always gets current server-specific display names and avatars
2. **Performance**: Smart caching reduces Discord API calls while maintaining freshness
3. **Accuracy**: Respects user's server-specific appearance preferences
4. **Maintainability**: Centralized configuration with database storage
5. **Monitoring**: Comprehensive logging and cache statistics
6. **Flexibility**: Force refresh capability for real-time accuracy

## Migration Notes

### Backward Compatibility
- Old methods are deprecated but still work
- Gradual migration path available
- Fallback mechanisms ensure no breaking changes

### Testing
- All identity methods now require message context for full functionality
- Tests should provide mock message objects with guild information
- Cache behavior can be tested with force refresh parameters

## Monitoring and Debugging

### Log Messages to Watch For
- `[BotIdentityService] Server-specific identity for {userId} in {guildId}: {nickname}`
- `[BotIdentityService] Cache hit for {cacheKey}`
- `[BotIdentityService] Expired cache entry removed for {cacheKey}`

### Performance Metrics
- Cache hit rate (should be >80% in normal operation)
- Identity resolution time (should be <100ms for cached, <500ms for fresh)
- Error rate (should be <1% in normal operation)

## Future Enhancements

1. **Webhook Integration**: Direct webhook calls with server-specific identities
2. **Bulk Identity Resolution**: Batch processing for multiple users
3. **Identity Change Detection**: Automatic cache invalidation on Discord events
4. **Cross-Server Identity Sync**: Consistent identities across multiple servers
