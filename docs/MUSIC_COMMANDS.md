# Creating Music Commands

This guide explains how to create and extend music-related commands for the bot's audio playback capabilities.

## Overview

The bot includes a robust music player system that handles YouTube playback, queue management, and voice channel interactions. Music commands allow users to control this system through Discord slash commands.

## Quick Start

1. Create a new file in `src/starbunk/commands/music/` with your command name (e.g., `shuffleCommand.ts`)
2. Use the template below
3. Register the command in `src/starbunk/commands/index.ts`
4. Restart the bot service

## Basic Template

```typescript
import { SlashCommandBuilder } from 'discord.js';
import { Command } from '../command';
import { getStarbunkClient } from '../../starbunkClient';
import { Logger } from '../../../services/logger';

export const shuffleCommand: Command = {
	data: new SlashCommandBuilder().setName('shuffle').setDescription('Shuffles the current music queue'),

	async execute(interaction) {
		try {
			// Get the music player from the client
			const client = getStarbunkClient();
			const musicPlayer = client.getMusicPlayer();

			// Check if there's an active queue
			if (!musicPlayer.hasQueue()) {
				return interaction.reply({
					content: '🔇 There are no songs in the queue to shuffle',
					ephemeral: true,
				});
			}

			// Execute the shuffle
			musicPlayer.shuffleQueue();

			return interaction.reply({
				content: '🔀 Queue has been shuffled!',
			});
		} catch (error) {
			Logger.error('Error in shuffle command:', error as Error);
			return interaction.reply({
				content: 'An error occurred while trying to shuffle the queue',
				ephemeral: true,
			});
		}
	},
};
```

## Command Registration

Add your command to the command collection in `src/starbunk/commands/index.ts`:

```typescript
// ... existing imports
import { shuffleCommand } from './music/shuffleCommand';

// ... existing code
export const commands: Collection<string, Command> = new Collection([
	// ... existing commands
	['shuffle', shuffleCommand],
]);
```

## Core Music Commands

The primary music commands are:

1. **Play** - Plays a song from YouTube
2. **Stop** - Stops playback and disconnects
3. **Skip** - Skips to the next song in queue
4. **Volume** - Adjusts playback volume
5. **Queue** - Shows the current song queue

## Creating Advanced Commands

Here's an example of a more advanced music command that implements repeat functionality:

```typescript
import { SlashCommandBuilder } from 'discord.js';
import { Command } from '../command';
import { getStarbunkClient } from '../../starbunkClient';
import { Logger } from '../../../services/logger';

export const repeatCommand: Command = {
	data: new SlashCommandBuilder()
		.setName('repeat')
		.setDescription('Toggle repeat mode for the current song or queue')
		.addStringOption((option) =>
			option
				.setName('mode')
				.setDescription('Repeat mode')
				.setRequired(true)
				.addChoices(
					{ name: 'Off', value: 'off' },
					{ name: 'Song', value: 'song' },
					{ name: 'Queue', value: 'queue' },
				),
		),

	async execute(interaction) {
		try {
			const mode = interaction.options.getString('mode', true);
			const client = getStarbunkClient();
			const musicPlayer = client.getMusicPlayer();

			// Check if there's active playback
			if (!musicPlayer.getCurrentSong()) {
				return interaction.reply({
					content: '🔇 There is nothing currently playing',
					ephemeral: true,
				});
			}

			switch (mode) {
				case 'off':
					musicPlayer.setRepeatMode('off');
					return interaction.reply('▶️ Repeat mode turned off');

				case 'song':
					musicPlayer.setRepeatMode('song');
					return interaction.reply('🔂 Now repeating the current song');

				case 'queue':
					musicPlayer.setRepeatMode('queue');
					return interaction.reply('🔁 Now repeating the entire queue');

				default:
					return interaction.reply({
						content: '❌ Invalid repeat mode',
						ephemeral: true,
					});
			}
		} catch (error) {
			Logger.error('Error in repeat command:', error as Error);
			return interaction.reply({
				content: 'An error occurred while trying to set repeat mode',
				ephemeral: true,
			});
		}
	},
};
```

## Testing Music Commands

Add a test in `src/tests/starbunk/commands/`:

```typescript
import { mockInteraction, mockDJCova } from '../../testUtils';
import { repeatCommand } from '../../../starbunk/commands/music/repeatCommand';
import { getStarbunkClient } from '../../../starbunk/starbunkClient';

// Mock the StarbunkClient and MusicPlayer
jest.mock('../../../starbunk/starbunkClient');
const mockGetStarbunkClient = getStarbunkClient as jest.MockedFunction<typeof getStarbunkClient>;

describe('Repeat Command', () => {
	beforeEach(() => {
		jest.clearAllMocks();

		// Setup mocks
		mockGetStarbunkClient.mockReturnValue(mockDJCova);

		// Mock current song exists
		mockDJCova.getMusicPlayer().getCurrentSong = jest.fn().mockReturnValue({
			title: 'Test Song',
			url: 'https://youtube.com/watch?v=test',
		});
	});

	it('should set repeat mode to song', async () => {
		// Arrange
		const interaction = mockInteraction();
		interaction.options.getString.mockReturnValue('song');
		const setRepeatModeSpy = jest.spyOn(mockDJCova.getMusicPlayer(), 'setRepeatMode');

		// Act
		await repeatCommand.execute(interaction);

		// Assert
		expect(setRepeatModeSpy).toHaveBeenCalledWith('song');
		expect(interaction.reply).toHaveBeenCalledWith(expect.stringContaining('repeating the current song'));
	});

	it('should return error when no song is playing', async () => {
		// Arrange
		const interaction = mockInteraction();
		interaction.options.getString.mockReturnValue('song');
		mockDJCova.getMusicPlayer().getCurrentSong = jest.fn().mockReturnValue(null);

		// Act
		await repeatCommand.execute(interaction);

		// Assert
		expect(interaction.reply).toHaveBeenCalledWith(
			expect.objectContaining({
				content: expect.stringContaining('nothing currently playing'),
				ephemeral: true,
			}),
		);
	});
});
```

## Implementing Voice Channel Logic

Music commands often need to check if the user is in a voice channel:

```typescript
// Check if the user is in a voice channel
const member = interaction.member;
if (!member || !('voice' in member) || !member.voice.channel) {
	return interaction.reply({
		content: '❌ You need to be in a voice channel to use this command',
		ephemeral: true,
	});
}

// Get the voice channel
const voiceChannel = member.voice.channel;
```

## Handling YouTube URLs

When implementing commands that accept YouTube URLs:

```typescript
// In play command
const url = interaction.options.getString('url', true);

// Validate YouTube URL
const youtubePattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
if (!youtubePattern.test(url)) {
	return interaction.reply({
		content: '❌ Please provide a valid YouTube link',
		ephemeral: true,
	});
}
```

## Tips & Best Practices

1. **Handle errors gracefully**: Always wrap command execution in try/catch blocks
2. **Check permissions**: Ensure the bot has the necessary permissions in the voice channel
3. **Give feedback**: Always respond to commands, even if just to acknowledge receipt
4. **Use ephemeral replies**: Use ephemeral replies for error messages to reduce chat clutter
5. **Implement cooldowns**: For resource-intensive commands, consider adding cooldowns
6. **Keep it simple**: Commands should do one thing well rather than many things poorly

## Music Player Interface

The music player provides these key methods:

```typescript
interface MusicPlayer {
	start(voiceChannel: VoiceChannel, url: string): Promise<void>; // Start playback
	stop(): void; // Stop playback
	skip(): void; // Skip to next song
	setVolume(volume: number): void; // Set volume (0-100)
	getQueue(): Song[]; // Get current queue
	getCurrentSong(): Song | null; // Get current song
	hasQueue(): boolean; // Check if queue exists
	shuffleQueue(): void; // Shuffle queue
	setRepeatMode(mode: 'off' | 'song' | 'queue'): void; // Set repeat mode
	// ... other methods
}
```
