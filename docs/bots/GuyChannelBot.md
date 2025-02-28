# GuyChannelBot

GuyChannelBot is a voice bot that manages voice channel access for a user named "Guy".

## Overview

GuyChannelBot monitors voice channel events and enforces specific rules:
1. A user named "Guy" cannot join the "NoGuyLounge" voice channel
2. Users who are not "Guy" cannot join the "GuyLounge" voice channel

When these rules are violated, the bot automatically moves the user to a default channel (Lounge1).

## Implementation

GuyChannelBot is implemented as a VoiceBot with specific channel redirect rules:

```typescript
export default function createGuyChannelBot(): VoiceBot {
	const rules = [
		new GuyNoGuyLoungeRule(),
		new NonGuyGuyLoungeRule()
	];

	const handler = new VoiceChannelRuleHandler(rules);
	return {
		handleVoiceStateUpdate: (oldState, newState) => handler.handleVoiceState(oldState, newState)
	};
}
```

## Rules

GuyChannelBot implements two main rules:

### GuyNoGuyLoungeRule

```typescript
export class GuyNoGuyLoungeRule implements ChannelRedirectRule {
	shouldRedirect(member: VoiceState['member'], channelId: string | null): boolean {
		return member?.id === userID.Guy && channelId === channelIDs.NoGuyLounge;
	}

	getRedirectChannelId(): string {
		return channelIDs.Lounge1;
	}
}
```

### NonGuyGuyLoungeRule

```typescript
export class NonGuyGuyLoungeRule implements ChannelRedirectRule {
	shouldRedirect(member: VoiceState['member'], channelId: string | null): boolean {
		return member?.id !== userID.Guy && channelId === channelIDs.GuyLounge;
	}

	getRedirectChannelId(): string {
		return channelIDs.Lounge1;
	}
}
```

## Examples

### When GuyChannelBot Takes Action

GuyChannelBot will take action in the following scenarios:

| Scenario | Action |
|----------|--------|
| User "Guy" tries to join "NoGuyLounge" | Moves "Guy" to "Lounge1" |
| Any user other than "Guy" tries to join "GuyLounge" | Moves that user to "Lounge1" |

### When GuyChannelBot Doesn't Take Action

GuyChannelBot will not take action in these scenarios:

| Scenario | Reason |
|----------|--------|
| User "Guy" joins "GuyLounge" | This is allowed by the rules |
| User "Guy" joins "Lounge1" | This is not a restricted channel |
| Any user other than "Guy" joins "NoGuyLounge" | This is allowed by the rules |
| Any user other than "Guy" joins "Lounge1" | This is not a restricted channel |

## Configuration

- **Restricted Channels**:
  - "NoGuyLounge" (Guy cannot join)
  - "GuyLounge" (Only Guy can join)
- **Default Redirect Channel**: "Lounge1"

## Testing

GuyChannelBot has tests in `src/tests/starbunk/voice-bots/guyChannelBot.test.ts` that verify:

1. The bot correctly redirects "Guy" from "NoGuyLounge"
2. The bot correctly redirects non-Guy users from "GuyLounge"
3. The bot allows valid channel joins
4. The bot handles edge cases like null channel IDs
