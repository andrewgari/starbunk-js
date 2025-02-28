import { getVoiceConnection } from '@discordjs/voice';
import { CommandInteraction, Guild } from 'discord.js';
import guildIDs from '../../../discord/guildIDs';
import { Logger } from '../../../services/logger';
import stopCommand from '../../../starbunk/commands/stop';
import { getStarbunkClient } from '../../../starbunk/starbunkClient';

// Mock dependencies
jest.mock('@discordjs/voice');
jest.mock('../../../starbunk/starbunkClient');
jest.mock('../../../services/logger');

describe('stop Command', () => {
	let mockInteraction: Partial<CommandInteraction>;
	let mockMusicPlayer: {
		stop: jest.Mock;
	};
	let mockClient: {
		getMusicPlayer: jest.Mock;
	};
	let mockConnection: {
		disconnect: jest.Mock;
	};
	let mockGuild: Partial<Guild>;

	beforeEach(() => {
		// Create mock music player
		mockMusicPlayer = {
			stop: jest.fn()
		};

		// Create mock client
		mockClient = {
			getMusicPlayer: jest.fn().mockReturnValue(mockMusicPlayer)
		};

		// Mock getStarbunkClient to return our mock client
		(getStarbunkClient as jest.Mock).mockReturnValue(mockClient);

		// Create mock connection
		mockConnection = {
			disconnect: jest.fn()
		};

		// Mock getVoiceConnection to return our mock connection
		(getVoiceConnection as jest.Mock).mockReturnValue(mockConnection);

		// Create mock guild
		mockGuild = {
			id: 'test-guild-id'
		} as Partial<Guild>;

		// Create mock interaction
		mockInteraction = {
			reply: jest.fn().mockResolvedValue(undefined),
			guild: mockGuild,
			client: mockClient
		} as unknown as Partial<CommandInteraction>;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should stop playback and disconnect when connected to a voice channel', async () => {
		// Execute the command
		await stopCommand.execute(mockInteraction as CommandInteraction);

		// Verify the player was stopped
		expect(mockMusicPlayer.stop).toHaveBeenCalled();

		// Verify the connection was disconnected
		expect(mockConnection.disconnect).toHaveBeenCalled();

		// Verify the interaction was replied to
		expect(mockInteraction.reply).toHaveBeenCalledWith('🛑 Stopped playback and left the voice channel');

		// Verify the log message
		expect(Logger.info).toHaveBeenCalledWith('🛑 Stopped playback and disconnected from voice channel');
	});

	it('should handle missing client', async () => {
		// Mock getStarbunkClient to return null
		(getStarbunkClient as jest.Mock).mockReturnValue(null);

		// Execute the command
		await stopCommand.execute(mockInteraction as CommandInteraction);

		// Verify the interaction was replied to with an error
		expect(mockInteraction.reply).toHaveBeenCalledWith({
			content: 'Unable to access audio player',
			ephemeral: true
		});

		// Verify the player was not stopped
		expect(mockMusicPlayer.stop).not.toHaveBeenCalled();

		// Verify the connection was not disconnected
		expect(mockConnection.disconnect).not.toHaveBeenCalled();
	});

	it('should handle not being in a voice channel', async () => {
		// Mock getVoiceConnection to return null
		(getVoiceConnection as jest.Mock).mockReturnValue(null);

		// Execute the command
		await stopCommand.execute(mockInteraction as CommandInteraction);

		// Verify the interaction was replied to with an error
		expect(mockInteraction.reply).toHaveBeenCalledWith({
			content: 'Not currently in a voice channel',
			ephemeral: true
		});

		// Verify the player was not stopped
		expect(mockMusicPlayer.stop).not.toHaveBeenCalled();
	});

	it('should use default guild ID when guild is not available', async () => {
		// Set guild to null
		Object.defineProperty(mockInteraction, 'guild', {
			get: jest.fn().mockReturnValue(null)
		});

		// Execute the command
		await stopCommand.execute(mockInteraction as CommandInteraction);

		// Verify getVoiceConnection was called with the default guild ID
		expect(getVoiceConnection).toHaveBeenCalledWith(guildIDs.StarbunkCrusaders);

		// Verify the player was stopped
		expect(mockMusicPlayer.stop).toHaveBeenCalled();

		// Verify the connection was disconnected
		expect(mockConnection.disconnect).toHaveBeenCalled();
	});

	it('should handle errors', async () => {
		// Mock getMusicPlayer to throw an error
		mockClient.getMusicPlayer.mockImplementation(() => {
			throw new Error('Test error');
		});

		// Execute the command
		await stopCommand.execute(mockInteraction as CommandInteraction);

		// Verify the error was logged
		expect(Logger.error).toHaveBeenCalledWith('Error stopping playback', expect.any(Error));

		// Verify the interaction was replied to with an error
		expect(mockInteraction.reply).toHaveBeenCalledWith({
			content: 'An error occurred while stopping playback',
			ephemeral: true
		});
	});
});
