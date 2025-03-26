# Voice Bots

This directory contains bots that respond to voice channel events in Discord.

## How Voice Bots Work

Voice bots can be implemented using either the strategy pattern (recommended) or by extending the `BaseVoiceBot` class.

### Strategy Pattern (Recommended)

```typescript
// triggers.ts
export const voiceChannelTrigger = createVoiceTrigger({
	name: 'voice-trigger',
	condition: userJoinedVoiceChannel(),
	handler: async (oldState, newState) => {
		// Handle voice state change
	}
});

// index.ts
export default createVoiceBot({
	name: 'ExampleVoiceBot',
	description: 'Example voice bot using strategy pattern',
	defaultIdentity: {
		botName: 'Example Voice Bot',
		avatarUrl: 'https://example.com/avatar.png'
	},
	triggers: [voiceChannelTrigger]
});
```

### Class-Based Pattern (Legacy)

```typescript
export default class ExampleVoiceBot extends BaseVoiceBot {
	public readonly botName = 'Example Voice Bot';

	constructor(logger?: ILogger) {
		super(logger);
	}

	handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): void {
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

## Core Components

The voice bot system includes several core components:

- `voice-conditions.ts`: Reusable conditions for voice events
- `voice-bot-builder.ts`: Creates voice bots from collections of triggers
- `voice-bot-adapter.ts`: Adapts voice bots to work with the bot registry

## Available Voice Bots

| Bot           | Description                                                                                                                                           |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| GuyChannelBot | Enforces channel access rules by redirecting users from restricted channels. Guy cannot join No-Guy-Lounge, and other users cannot join Guy's lounge. |

## Adding New Voice Bots

### Using Strategy Pattern (Recommended)

1. Create a new directory under `voice-bots/` with your bot name
2. Create the following files:
   - `constants.ts`: Static data like bot name, avatar URL
   - `triggers.ts`: Voice event triggers and handlers
   - `index.ts`: Main bot definition using `createVoiceBot`

Example structure:
```
voice-bots/
  your-bot-name/
    constants.ts
    triggers.ts
    index.ts
```

### Using Class-Based Pattern (Legacy)

1. Create a new file named `yourBotNameBot.ts`
2. Extend the `BaseVoiceBot` class
3. Implement voice event handling logic in the `handleVoiceStateUpdate` method

## Bot Commands

Voice bots can be managed using Discord slash commands:

- `/bot enable <bot_name>` - Enable a voice bot
- `/bot disable <bot_name>` - Disable a voice bot
- `/bot volume <bot_name> <volume>` - Set the bot's volume (0-100%)
- `/bot list-bots` - List all bots including voice bots

## Testing Voice Bots

Each voice bot should have corresponding tests in the `__tests__` directory to verify its behavior. Example test structure:

```typescript
describe('YourVoiceBot', () => {
	let bot: YourVoiceBot;
	let mockLogger: jest.Mocked<ILogger>;

	beforeEach(() => {
		mockLogger = createMockLogger();
		bot = new YourVoiceBot(mockLogger);
	});

	it('should handle user joining voice channel', () => {
		const oldState = createMockVoiceState({ channelId: null });
		const newState = createMockVoiceState({ channelId: '123' });

		bot.handleVoiceStateUpdate(oldState, newState);

		// Assert expected behavior
	});
});
```
