# Discord ID Consolidation

## Overview

This document describes the consolidation of hardcoded Discord IDs across the Starbunk codebase. The goal was to reduce duplication, improve maintainability, and move configuration to environment variables and the database.

## Changes Made

### 1. Essential IDs Moved to Environment Variables

**STARBUNK_CLIENT_ID** (New)
- **Purpose**: Discord application/client ID used by all containers
- **Environment Variable**: `STARBUNK_CLIENT_ID`
- **Fallback**: `CLIENT_ID` (for backward compatibility)
- **Default**: `836445923105308672`
- **Usage**: Bot identification and exclusion logic

**COVA_USER_ID** (Existing)
- **Purpose**: Discord user ID for debug mode filtering
- **Environment Variable**: `COVA_USER_ID`
- **Default**: `139592376443338752`
- **Usage**: In DEBUG_MODE, CovaBot will ONLY respond to this user ID

**TESTING_SERVER_IDS** (Existing)
- **Purpose**: Whitelist of Discord server/guild IDs for testing
- **Environment Variable**: `TESTING_SERVER_IDS` (comma-separated)
- **Usage**: When set, bots only process messages from these servers

**TESTING_CHANNEL_IDS** (Existing)
- **Purpose**: Whitelist of Discord channel IDs for testing
- **Environment Variable**: `TESTING_CHANNEL_IDS` (comma-separated)
- **Usage**: When set, bots only process messages from these channels

### 2. Deprecated Files Updated

**packages/shared/src/discord/userId.ts**
- Removed all hardcoded user IDs except Cova
- Now only exports `Cova` ID from `COVA_USER_ID` environment variable
- Added deprecation warning to use ConfigurationService or environment variables

**packages/shared/src/discord/channelIds.ts**
- Removed all hardcoded channel IDs
- Now exports empty object
- Added deprecation warning to use `TESTING_CHANNEL_IDS` or ConfigurationService

**packages/shared/src/discord/guildIds.ts**
- Removed all hardcoded guild IDs
- Now exports empty object
- Added deprecation warning to use `GUILD_ID`, `TESTING_SERVER_IDS`, or ConfigurationService

### 3. ConfigurationService Updated

**packages/shared/src/services/configuration/configurationService.ts**
- Removed hardcoded fallback user IDs for all users except Cova
- `FALLBACK_USER_IDS` now only contains Cova ID from environment variable
- Forces proper database usage for all other user lookups

### 4. Bot Conditions Updated

**apps/bunkbot/src/core/conditions.ts**
**apps/bunkbot/src/core/conditions-refactored.ts**
- Updated `BOT_IDENTIFIERS.STARBUNK_CLIENT_ID` to use environment variable
- Fallback chain: `STARBUNK_CLIENT_ID` → `CLIENT_ID` → hardcoded default

### 5. E2E Test Configuration

**apps/bunkbot/src/reply-bots/e2e-status-bot/constants.ts**
- Updated to use environment variables for test member IDs
- Defaults to empty strings if not set (E2E tests gracefully skip when IDs are missing)
- Provides `validateE2ETestIds()` function for explicit validation when needed

**apps/bunkbot/src/__tests__/bunkbot-sanity-check.test.ts**
- Updated test user IDs to use environment variables with hardcoded fallbacks (for local/dev usage)

## Environment Variables Reference

### Required for All Deployments
```bash
# Discord bot application ID
STARBUNK_CLIENT_ID=836445923105308672

# Primary guild/server ID
GUILD_ID=753251582719688714
```

### Required for Debug Mode
```bash
# Enable debug mode
DEBUG_MODE=true

# User ID for debug filtering (CovaBot only responds to this user in debug mode)
COVA_USER_ID=139592376443338752
```

### Optional for Testing/Development
```bash
# Restrict bot to specific servers (comma-separated)
TESTING_SERVER_IDS=753251582719688714,987654321098765432

# Restrict bot to specific channels (comma-separated)
TESTING_CHANNEL_IDS=123456789012345678,987654321098765432
```

### Optional for E2E Tests
```bash
# E2E test member IDs (only needed for automated testing)
E2E_TEST_MEMBER_ID=your-test-member-id
E2E_ID_VENN=your-venn-test-id
E2E_ID_GUY=your-guy-test-id
E2E_ID_SIGGREAT=your-sig-test-id
```

## Migration Guide

### For User ID Lookups
**Before:**
```typescript
import userId from '@starbunk/shared/discord/userId';
const chadId = userId.Chad;
```

**After:**
```typescript
import { ConfigurationService } from '@starbunk/shared';
const configService = new ConfigurationService();
const chadId = await configService.getUserIdByUsername('Chad');
```

### For Channel/Guild Whitelisting
**Before:**
```typescript
import channelIds from '@starbunk/shared/discord/channelIds';
const botChannel = channelIds.Starbunk.BotChannel;
```

**After:**
```typescript
// Use environment variable for whitelisting
const testingChannels = process.env.TESTING_CHANNEL_IDS?.split(',') || [];

// Or use ConfigurationService for dynamic lookups
const configService = new ConfigurationService();
const channelId = await configService.getChannelIdByName('bot-commands');
```

## Benefits

1. **Reduced Duplication**: Single source of truth for each ID
2. **Environment-Based Configuration**: Easy to change IDs without code changes
3. **Database-First Approach**: Encourages proper use of ConfigurationService
4. **Cleaner Testing**: Test IDs are clearly separated from production IDs
5. **Better Security**: Sensitive IDs can be managed via environment variables

## Future Work

- Consider removing deprecated files entirely once all references are updated
- Add database seeding for common user/channel/guild configurations
- Create migration script to populate database from environment variables

