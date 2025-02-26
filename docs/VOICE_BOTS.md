# Creating Voice Bots

Voice bots are specialized modules that respond to voice channel events, such as users joining/leaving channels or changing their voice status. Unlike reply bots, voice bots interact with Discord's voice system.

## Quick Start

1. Create a new file in `src/starbunk/bots/voice-bots/` with your bot name (e.g., `welcomeBot.ts`)
2. Use the template below
3. Restart the bot service

Your voice bot will automatically be registered and ready to respond to voice events.

## Basic Template

```typescript
import { VoiceState } from 'discord.js';
import { Logger } from '../../../services/logger';
import StarbunkClient from '../../starbunkClient';
import VoiceBot from '../voiceBot';

export default class WelcomeBot implements VoiceBot {
	private client: StarbunkClient;

	constructor(client: StarbunkClient) {
		this.client = client;
		Logger.info('WelcomeBot initialized');
	}

	getBotName(): string {
		return 'WelcomeBot';
	}

	handleEvent(oldState: VoiceState, newState: VoiceState): void {
		try {
			// User joined a voice channel (wasn't in one before)
			if (!oldState.channelId && newState.channelId) {
				this.handleUserJoin(newState);
			}

			// User left a voice channel (was in one before)
			if (oldState.channelId && !newState.channelId) {
				this.handleUserLeave(oldState);
			}

			// User switched channels
			if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
				this.handleUserSwitch(oldState, newState);
			}
		} catch (error) {
			Logger.error(`Error in ${this.getBotName()}:`, error as Error);
		}
	}

	private handleUserJoin(state: VoiceState): void {
		// Get the text channel associated with the voice channel's category
		const category = state.channel?.parent;
		const textChannels = category?.children.cache.filter((channel) => channel.isTextBased());

		if (textChannels && textChannels.size > 0) {
			const textChannel = textChannels.first();
			textChannel?.send(`👋 Welcome to voice, ${state.member?.displayName}!`);
		}
	}

	private handleUserLeave(state: VoiceState): void {
		// Optional: Handle user leaving voice
	}

	private handleUserSwitch(oldState: VoiceState, newState: VoiceState): void {
		// Optional: Handle user switching voice channels
	}
}
```

## Advanced Example: Music Announcer Bot

```typescript
import { VoiceState } from 'discord.js';
import { getVoiceConnection, AudioPlayerStatus } from '@discordjs/voice';
import { Logger } from '../../../services/logger';
import StarbunkClient from '../../starbunkClient';
import VoiceBot from '../voiceBot';

export default class MusicAnnouncerBot implements VoiceBot {
	private client: StarbunkClient;

	constructor(client: StarbunkClient) {
		this.client = client;

		// Listen for music player status changes
		const musicPlayer = this.client.getMusicPlayer();

		// Set up player status event listeners if available
		if (musicPlayer && musicPlayer.player) {
			musicPlayer.player.on(AudioPlayerStatus.Playing, this.handleSongStart.bind(this));
			musicPlayer.player.on(AudioPlayerStatus.Idle, this.handleSongEnd.bind(this));
		}

		Logger.info('MusicAnnouncerBot initialized');
	}

	getBotName(): string {
		return 'MusicAnnouncerBot';
	}

	handleEvent(oldState: VoiceState, newState: VoiceState): void {
		try {
			// Check if bot is alone in voice channel after user leaves
			if (oldState.channelId && !newState.channelId) {
				this.checkIfBotIsAlone(oldState.channelId);
			}
		} catch (error) {
			Logger.error(`Error in ${this.getBotName()}:`, error as Error);
		}
	}

	private async handleSongStart(): Promise<void> {
		const currentSong = this.client.getMusicPlayer().getCurrentSong();
		if (!currentSong) return;

		// Find the appropriate text channel to announce in
		const guildId = this.client.guilds.cache.first()?.id;
		if (!guildId) return;

		// Get the first text channel we can message in
		const textChannel = this.client.guilds.cache
			.get(guildId)
			?.channels.cache.find((channel) => channel.isTextBased());

		if (textChannel && 'send' in textChannel) {
			textChannel.send(`🎵 Now playing: **${currentSong.title}**`);
		}
	}

	private async handleSongEnd(): Promise<void> {
		// Optional: Announce when a song ends
	}

	private checkIfBotIsAlone(channelId: string): void {
		const guildId = this.client.guilds.cache.first()?.id;
		if (!guildId) return;

		const connection = getVoiceConnection(guildId);
		if (!connection) return;

		const channel = this.client.channels.cache.get(channelId);
		if (!channel || !('members' in channel)) return;

		// If only the bot is left in the channel
		if (channel.members.size <= 1) {
			Logger.info('Bot is alone in voice channel, disconnecting');
			connection.disconnect();
			this.client.getMusicPlayer().stop();

			// Find a text channel to notify
			const textChannel = this.client.guilds.cache
				.get(guildId)
				?.channels.cache.find((channel) => channel.isTextBased());

			if (textChannel && 'send' in textChannel) {
				textChannel.send('🔇 Disconnected from voice channel because everyone left');
			}
		}
	}
}
```

## Testing Your Voice Bot

Add a test in `src/__tests__/starbunk/bots/`:

```typescript
import { VoiceState, ChannelType } from 'discord.js';
import StarbunkClient from '../../../starbunk/starbunkClient';
import WelcomeBot from '../../../starbunk/bots/voice-bots/welcomeBot';

describe('WelcomeBot', () => {
	let bot: WelcomeBot;
	let mockClient: Partial<StarbunkClient>;
	let oldState: Partial<VoiceState>;
	let newState: Partial<VoiceState>;

	beforeEach(() => {
		mockClient = {} as StarbunkClient;

		const mockTextChannel = {
			send: jest.fn(),
			isTextBased: () => true,
		};

		const mockCategory = {
			children: {
				cache: new Map([['text-channel-id', mockTextChannel]]),
			},
		};

		const mockVoiceChannel = {
			parent: mockCategory,
			id: 'voice-channel-id',
			type: ChannelType.GuildVoice,
			members: new Map(),
		};

		oldState = {
			channelId: null,
			channel: null,
			member: {
				displayName: 'TestUser',
			},
		} as unknown as Partial<VoiceState>;

		newState = {
			channelId: 'voice-channel-id',
			channel: mockVoiceChannel,
			member: {
				displayName: 'TestUser',
			},
		} as unknown as Partial<VoiceState>;

		bot = new WelcomeBot(mockClient as StarbunkClient);
	});

	it('should announce when user joins voice channel', () => {
		bot.handleEvent(oldState as VoiceState, newState as VoiceState);

		// Verify the text channel's send method was called with welcome message
		const textChannel = newState.channel?.parent?.children.cache.values().next().value;
		expect(textChannel.send).toHaveBeenCalledWith(expect.stringContaining('Welcome to voice'));
	});
});
```

## Voice Event Types

Voice state updates occur in these main scenarios:

1. **User Joins**: `!oldState.channelId && newState.channelId`
2. **User Leaves**: `oldState.channelId && !newState.channelId`
3. **User Switches Channels**: `oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId`
4. **User Mutes/Unmutes**: `oldState.selfMute !== newState.selfMute`
5. **User Deafens/Undeafens**: `oldState.selfDeaf !== newState.selfDeaf`
6. **User Starts/Stops Streaming**: `oldState.streaming !== newState.streaming`
7. **User Enables/Disables Camera**: `oldState.selfVideo !== newState.selfVideo`

## Tips & Best Practices

1. **Handle errors gracefully**: Always use try/catch in your event handlers
2. **Check for nulls**: Voice states may contain null values when users disconnect
3. **Use appropriate permissions**: Ensure your bot has permissions to see voice states
4. **Test with multiple users**: Voice behaviors can be complex with multiple users
5. **Limit announcements**: Avoid spamming chat channels with too many voice notifications
6. **Clean disconnections**: When using voice connections, always clean up properly

## Auto-Registration

The StarbunkClient automatically registers all voice bots in the `src/starbunk/bots/voice-bots/` directory. You don't need to manually register your voice bot.

```typescript
// From starbunkClient.ts - this happens automatically
registerVoiceBots = async (): Promise<void> => {
	try {
		const botFiles = readdirSync('./src/starbunk/bots/voice-bots');
		this.logger.info(`Found ${botFiles.length} voice bots to register`);

		for (const file of botFiles) {
			// ... loading logic
			const bot = new botModule.default(this);
			this.voiceBots.set(bot.getBotName(), bot);
		}
	} catch (error) {
		this.logger.error('Error registering voice bots:', error as Error);
	}
};
```
