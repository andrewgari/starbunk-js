# Snowbunk

Snowbunk is a Discord bot that synchronizes messages between paired channels across different Discord servers.

## Functionality

Snowbunk creates a bridge between configured channels, automatically copying messages sent in one channel to its paired channel(s) in other servers. This maintains consistent conversation across multiple Discord communities.

## Architecture

```
┌─────────────────────┐
│  SnowbunkClient     │
├─────────────────────┤
│ - Channel mapping   │
│ - Message syncing   │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Event Listeners    │
│ (MessageCreate)     │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Webhook Service    │
└─────────────────────┘
```

## How It Works

1. **Channel Mapping**: Maintains a configuration of which channels should be synced with each other
2. **Message Monitoring**: Listens for new messages in all configured channels
3. **Message Replication**: When a message is detected in a monitored channel, it's copied to all linked channels
4. **User Identity Preservation**: Uses webhooks to maintain the sender's display name and avatar

## Implementation Details

- The `channelMap` property defines channel pairings using Discord channel IDs
- Messages from bots are ignored to prevent feedback loops
- User display names and avatars are preserved across servers when possible
- Messages are sent via webhook to customize the appearance

## Configuration

To add new channel pairs, edit the `channelMap` in `snowbunkClient.ts`:

```typescript
private readonly channelMap: Record<string, Array<string>> = {
  // Source channel ID: [Target channel IDs]
  'source_channel_id': ['target_channel_id_1', 'target_channel_id_2'],
  'target_channel_id_1': ['source_channel_id', 'target_channel_id_2'],
  'target_channel_id_2': ['source_channel_id', 'target_channel_id_1'],
};
```

**Important**: Each channel mapping should be bidirectional to ensure messages sync in both directions.
