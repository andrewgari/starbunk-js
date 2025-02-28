import { CommandInteraction } from 'discord.js';
import { Logger } from '../../../services/logger';
import setVolumeCommand from '../../../starbunk/commands/setVolume';
import { getStarbunkClient } from '../../../starbunk/starbunkClient';

// Mock dependencies
jest.mock('../../../starbunk/starbunkClient');
jest.mock('../../../services/logger');

// Define interfaces for our mocks to avoid 'any'
interface MockMusicPlayer {
	changeVolume: jest.Mock;
}

interface MockStarbunkClient {
	getMusicPlayer: jest.Mock<MockMusicPlayer>;
}

describe('setVolume Command', () => {
	let mockInteraction: Partial<CommandInteraction>;
	let mockMusicPlayer: MockMusicPlayer;
	let mockClient: MockStarbunkClient;
	let mockOptionsGet: jest.Mock;

	beforeEach(() => {
		// Create mock music player
		mockMusicPlayer = {
			changeVolume: jest.fn()
		};

		// Create mock client
		mockClient = {
			getMusicPlayer: jest.fn().mockReturnValue(mockMusicPlayer)
		};

		// Mock getStarbunkClient to return our mock client
		(getStarbunkClient as jest.Mock).mockReturnValue(mockClient);

		// Create mock for options.get
		mockOptionsGet = jest.fn().mockImplementation((name) => {
			// Return value based on parameter name - 'noise' is the correct parameter
			if (name === 'noise') {
				return { value: 50 };
			}
			return undefined;
		});

		// Create mock interaction
		mockInteraction = {
			reply: jest.fn().mockResolvedValue(undefined),
			options: {
				get: mockOptionsGet
			}
		} as unknown as Partial<CommandInteraction>;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should set the volume when given a valid value', async () => {
		// Execute the command
		await setVolumeCommand.execute(mockInteraction as CommandInteraction);

		// Verify the volume was set
		expect(mockMusicPlayer.changeVolume).toHaveBeenCalledWith(50);

		// Verify the interaction was replied to
		expect(mockInteraction.reply).toHaveBeenCalledWith('🔊 Volume set to 50%');
	});

	it('should handle minimum valid volume value (1)', async () => {
		// Update the mock to return minimum valid value
		mockOptionsGet.mockImplementation((name) => {
			if (name === 'noise') {
				return { value: 1 };
			}
			return undefined;
		});

		// Execute the command
		await setVolumeCommand.execute(mockInteraction as CommandInteraction);

		// Verify the volume was set to minimum value
		expect(mockMusicPlayer.changeVolume).toHaveBeenCalledWith(1);

		// Verify the interaction was replied to
		expect(mockInteraction.reply).toHaveBeenCalledWith('🔊 Volume set to 1%');
	});

	it('should handle maximum valid volume value (100)', async () => {
		// Update the mock to return maximum valid value
		mockOptionsGet.mockImplementation((name) => {
			if (name === 'noise') {
				return { value: 100 };
			}
			return undefined;
		});

		// Execute the command
		await setVolumeCommand.execute(mockInteraction as CommandInteraction);

		// Verify the volume was set to maximum value
		expect(mockMusicPlayer.changeVolume).toHaveBeenCalledWith(100);

		// Verify the interaction was replied to
		expect(mockInteraction.reply).toHaveBeenCalledWith('🔊 Volume set to 100%');
	});

	it('should handle invalid volume values (too high)', async () => {
		// Update the mock to return an invalid value (too high)
		mockOptionsGet.mockImplementation((name) => {
			if (name === 'noise') {
				return { value: 101 };
			}
			return undefined;
		});

		// Execute the command
		await setVolumeCommand.execute(mockInteraction as CommandInteraction);

		// Verify the volume was not set
		expect(mockMusicPlayer.changeVolume).not.toHaveBeenCalled();

		// Verify the interaction was replied to with an error
		expect(mockInteraction.reply).toHaveBeenCalledWith({
			content: 'Volume must be between 1 and 100',
			ephemeral: true
		});
	});

	it('should handle invalid volume values (too low)', async () => {
		// Update the mock to return an invalid value (too low)
		mockOptionsGet.mockImplementation((name) => {
			if (name === 'noise') {
				return { value: 0 };
			}
			return undefined;
		});

		// Execute the command
		await setVolumeCommand.execute(mockInteraction as CommandInteraction);

		// Verify the volume was not set
		expect(mockMusicPlayer.changeVolume).not.toHaveBeenCalled();

		// Verify the interaction was replied to with an error
		expect(mockInteraction.reply).toHaveBeenCalledWith({
			content: 'Volume must be between 1 and 100',
			ephemeral: true
		});
	});

	it('should handle missing volume parameter', async () => {
		// Update the mock to return undefined for the noise parameter
		mockOptionsGet.mockImplementation(() => undefined);

		// Execute the command
		await setVolumeCommand.execute(mockInteraction as CommandInteraction);

		// Verify the volume was not set
		expect(mockMusicPlayer.changeVolume).not.toHaveBeenCalled();

		// Verify the interaction was replied to with an error
		expect(mockInteraction.reply).toHaveBeenCalledWith({
			content: 'Volume must be between 1 and 100',
			ephemeral: true
		});
	});

	it('should handle missing client', async () => {
		// Mock getStarbunkClient to return null
		(getStarbunkClient as jest.Mock).mockReturnValue(null);

		// Execute the command
		await setVolumeCommand.execute(mockInteraction as CommandInteraction);

		// Verify the interaction was replied to with an error
		expect(mockInteraction.reply).toHaveBeenCalledWith({
			content: 'Unable to access audio player',
			ephemeral: true
		});
	});

	it('should handle errors', async () => {
		// Mock getMusicPlayer to throw an error
		mockClient.getMusicPlayer.mockImplementation(() => {
			throw new Error('Test error');
		});

		// Execute the command
		await setVolumeCommand.execute(mockInteraction as CommandInteraction);

		// Verify the error was logged
		expect(Logger.error).toHaveBeenCalledWith('Error setting volume', expect.any(Error));

		// Verify the interaction was replied to with an error
		expect(mockInteraction.reply).toHaveBeenCalledWith({
			content: 'An error occurred while setting the volume',
			ephemeral: true
		});
	});
});
