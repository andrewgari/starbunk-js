# Discord Bot Debug/Testing Configuration Guide

This document describes the new three-tier debug/testing configuration system that replaces the old single `DEBUG` environment variable.

## Overview

The new system provides flexible control over Discord bot behavior through three independent environment variables:

1. **DEBUG_MODE** - Controls debug logging and development behaviors
2. **TESTING_SERVER_IDS** - Restricts bot to specific Discord servers
3. **TESTING_CHANNEL_IDS** - Restricts bot to specific Discord channels

## Environment Variables

### DEBUG_MODE
- **Type**: Boolean (`true`/`false`)
- **Default**: `false`
- **Purpose**: Enables verbose debug logging and development-specific behaviors
- **Examples**:
  ```bash
  DEBUG_MODE=true   # Enable debug logging
  DEBUG_MODE=false  # Standard production logging
  ```

### TESTING_SERVER_IDS
- **Type**: Comma-separated list of Discord server/guild IDs
- **Default**: Empty (no restrictions)
- **Purpose**: When set, bot will ONLY process messages from servers in this list
- **Format**: Discord snowflake IDs (17-19 digit numbers)
- **Examples**:
  ```bash
  # Single server
  TESTING_SERVER_IDS=753251582719688714
  
  # Multiple servers
  TESTING_SERVER_IDS=753251582719688714,987654321098765432
  
  # No restrictions (default)
  TESTING_SERVER_IDS=
  ```

### TESTING_CHANNEL_IDS
- **Type**: Comma-separated list of Discord channel IDs
- **Default**: Empty (no restrictions)
- **Purpose**: When set, bot will ONLY process messages from channels in this list
- **Format**: Discord snowflake IDs (17-19 digit numbers)
- **Examples**:
  ```bash
  # Single channel
  TESTING_CHANNEL_IDS=123456789012345678
  
  # Multiple channels
  TESTING_CHANNEL_IDS=123456789012345678,987654321098765432
  
  # No restrictions (default)
  TESTING_CHANNEL_IDS=
  ```

## Behavior Matrix

| DEBUG_MODE | TESTING_SERVER_IDS | TESTING_CHANNEL_IDS | Behavior |
|------------|-------------------|-------------------|----------|
| `false` | Empty | Empty | Normal production operation |
| `true` | Empty | Empty | Production operation with debug logging |
| `false` | `123,456` | Empty | Production logging, only responds in servers 123 or 456 |
| `true` | `123` | `789,101` | Debug logging, only responds to channels 789 or 101 within server 123 |
| `false` | Empty | `789` | Production logging, only responds in channel 789 across any server |

## Message Processing Logic

For any incoming Discord message or interaction, the bot:

1. **Server Check**: If `TESTING_SERVER_IDS` is set, verify the message's server ID is in the allowed list
2. **Channel Check**: If `TESTING_CHANNEL_IDS` is set, verify the message's channel ID is in the allowed list
3. **Process**: Only process the message if it passes both checks (or if the respective restriction lists are empty)

### Special Cases

- **DM Messages**: When server restrictions exist but the message is a DM (no server ID), the message is allowed
- **Invalid IDs**: Invalid Discord IDs in the environment variables are automatically filtered out and logged
- **Whitespace**: Extra whitespace around IDs is automatically trimmed

## Container-Specific Behavior

### BunkBot (Reply Bots + Admin Commands)
- Filters both `MessageCreate` and `InteractionCreate` events
- Blocked interactions receive ephemeral error responses
- Blocked messages are silently ignored (unless debug mode)

### DJCova (Music Service)
- Filters `InteractionCreate` events only (no message processing)
- Blocked music commands receive ephemeral error responses

### Starbunk-DND (D&D Features)
- Filters `InteractionCreate` events only
- Blocked D&D commands receive ephemeral error responses

### CovaBot (AI Personality)
- Filters `MessageCreate` events only
- Blocked messages are silently ignored (unless debug mode)

## Debug Logging

When `DEBUG_MODE=true`, the system logs:

- Message filtering decisions (allowed/blocked with reasons)
- Server and channel information for each message
- Truncated message content (first 100 characters)
- Configuration details at startup

Example debug output:
```
🔧 Message Filter Configuration:
  Debug Mode: true
  Testing Server IDs: 753251582719688714
  Testing Channel IDs: None (all channels allowed)

✅ ALLOWED Message - Server: 753251582719688714, Channel: 123456789012345678, User: testuser (111222333444555666)
  Content: "hello bunkbot"

❌ BLOCKED Message - Server: 999888777666555444, Channel: 123456789012345678, User: testuser (111222333444555666)
  Reason: Server 999888777666555444 not in allowed testing servers
```

## Migration from Old DEBUG Variable

### Before (Old System)
```bash
DEBUG=true  # Single boolean for debug mode
```

### After (New System)
```bash
DEBUG_MODE=true              # Replaces old DEBUG variable
TESTING_SERVER_IDS=          # New: Server restrictions
TESTING_CHANNEL_IDS=         # New: Channel restrictions
```

### Backward Compatibility
- The old `DEBUG` variable is no longer used
- Update your `.env` files to use `DEBUG_MODE` instead
- All Docker Compose files have been updated with the new variables

## Configuration Examples

### Development Testing
```bash
DEBUG_MODE=true
TESTING_SERVER_IDS=753251582719688714
TESTING_CHANNEL_IDS=123456789012345678
```

### Production with Server Restrictions
```bash
DEBUG_MODE=false
TESTING_SERVER_IDS=753251582719688714,987654321098765432
TESTING_CHANNEL_IDS=
```

### Full Production (No Restrictions)
```bash
DEBUG_MODE=false
TESTING_SERVER_IDS=
TESTING_CHANNEL_IDS=
```

## Docker Compose Integration

All Docker Compose files (`docker-compose.yml`, `docker-compose.latest.yml`, `docker-compose.snapshot.yml`) have been updated to include the new environment variables:

```yaml
environment:
  - DEBUG_MODE=${DEBUG_MODE:-false}
  - TESTING_SERVER_IDS=${TESTING_SERVER_IDS:-}
  - TESTING_CHANNEL_IDS=${TESTING_CHANNEL_IDS:-}
```

## Testing

The system includes comprehensive unit tests for:
- Environment variable parsing and validation
- Discord ID validation
- Message filtering logic
- Configuration scenarios

Run tests with:
```bash
npm test containers/shared/src/utils/__tests__/envValidation.test.ts
npm test containers/shared/src/services/__tests__/messageFilter.test.ts
```

## Troubleshooting

### Invalid Discord IDs
If you see warnings about invalid Discord IDs:
```
Invalid Discord IDs found and ignored: abc123, 456def
```
Ensure all IDs are valid Discord snowflakes (17-19 digit numbers).

### Messages Not Being Processed
1. Check if server/channel restrictions are blocking the messages
2. Enable `DEBUG_MODE=true` to see filtering decisions
3. Verify Discord IDs are correct (right-click → Copy ID in Discord)

### Debug Logging Not Appearing
1. Ensure `DEBUG_MODE=true` is set
2. Check that the logger is configured properly
3. Verify the container is using the updated environment variables
