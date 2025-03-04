# Voice Bots

This directory contains bots that respond to voice channel events in Discord.

## How Voice Bots Work

Each voice bot:

1. Extends the abstract `VoiceBot` class
2. Monitors voice state changes via the `handleEvent` method
3. Reacts to users joining/leaving voice channels
4. Can perform actions like moving users between channels

## Voice Bot Structure

```typescript
export default class ExampleVoiceBot extends VoiceBot {
	public readonly botName = 'Example Voice Bot';

	constructor(logger?: ILogger) {
		super(logger);
	}

	handleEvent(oldState: VoiceState, newState: VoiceState): void {
		const member = oldState.member;
		const newChannelId = newState.channelId;
		const oldChannelId = oldState.channelId;

		// React to voice events here
		if (oldChannelId !== newChannelId) {
			this.logger.debug(
				`User ${member?.displayName} moved from ${oldChannelId || 'nowhere'} to ${newChannelId || 'nowhere'}`,
			);
		}
	}
}
```

## Available Voice Bots

| Bot           | Description                                                                                                                                           |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| GuyChannelBot | Enforces channel access rules by redirecting users from restricted channels. Guy cannot join No-Guy-Lounge, and other users cannot join Guy's lounge. |

## Adding New Voice Bots

1. Create a new file named `yourBotNameBot.ts`
2. Follow the VoiceBot structure above
3. Implement voice event handling logic in the `handleEvent` method
4. The bot will be automatically registered by the StarbunkClient

## Testing Voice Bots

Each voice bot should have corresponding tests in the `__tests__` directory to verify its behavior.
