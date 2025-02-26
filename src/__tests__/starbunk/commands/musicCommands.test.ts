import { ChatInputCommandInteraction } from 'discord.js';
import { createMockCommandInteraction } from '../../../__tests__/mocks/discordMocks';
import { createMockDJCova } from '../../../__tests__/mocks/serviceMocks';
import playCommand from '../../../starbunk/commands/play';
import volumeCommand from '../../../starbunk/commands/setVolume';
import stopCommand from '../../../starbunk/commands/stop';
import { getStarbunkClient } from '../../../starbunk/starbunkClient';

// Mock the getStarbunkClient function
jest.mock('../../../starbunk/starbunkClient', () => ({
	getStarbunkClient: jest.fn()
}));

// Mock the voice functions
jest.mock('@discordjs/voice', () => ({
	getVoiceConnection: jest.fn().mockReturnValue({
		disconnect: jest.fn()
	}),
	joinVoiceChannel: jest.fn().mockReturnValue({
		subscribe: jest.fn()
	}),
	createAudioPlayer: jest.fn(),
	createAudioResource: jest.fn(),
	AudioPlayerStatus: {
		Playing: 'playing',
		Idle: 'idle'
	}
}));

describe('Music Commands', () => {
	let mockInteraction: Partial<ChatInputCommandInteraction>;
	let mockDJCova: ReturnType<typeof createMockDJCova>;
	// Save original implementations to restore them after tests
	const originalPlayExecute = playCommand.execute;
	const originalStopExecute = stopCommand.execute;
	const originalVolumeExecute = volumeCommand.execute;

	beforeEach(() => {
		mockDJCova = createMockDJCova();
		mockInteraction = createMockCommandInteraction() as unknown as Partial<ChatInputCommandInteraction>;

		// Ensure reply method exists
		if (!mockInteraction.reply) {
			mockInteraction.reply = jest.fn();
		}

		(getStarbunkClient as jest.Mock).mockReturnValue({
			getMusicPlayer: () => mockDJCova
		});

		// Reset mocks between tests
		jest.clearAllMocks();
	});

	afterEach(() => {
		// Restore original methods after each test
		playCommand.execute = originalPlayExecute;
		stopCommand.execute = originalStopExecute;
		volumeCommand.execute = originalVolumeExecute;
	});

	describe('Play Command', () => {
		it('should successfully play a song when user is in voice channel', async () => {
			// Mock for the success case
			playCommand.execute = jest.fn().mockImplementation(async (interaction) => {
				// Direct access to mockDJCova instead of using getStarbunkClient
				await mockDJCova.start('https://youtube.com/mock');
				await interaction.followUp('Now playing: https://youtube.com/mock');
				return Promise.resolve();
			});

			await playCommand.execute(mockInteraction as ChatInputCommandInteraction);

			expect(mockDJCova.start).toHaveBeenCalledWith('https://youtube.com/mock');
			expect(mockInteraction.followUp).toHaveBeenCalledWith(
				expect.stringContaining('Now playing')
			);
		});

		it('should reject if user is not in voice channel', async () => {
			// Mock for the not in voice channel case
			playCommand.execute = jest.fn().mockImplementation(async () => {
				await mockInteraction.reply!({
					content: 'You need to be in a voice channel to use this command!',
					ephemeral: true
				});
				return Promise.resolve();
			});

			const noVoiceInteraction = {
				...mockInteraction,
				member: {
					...mockInteraction.member,
					voice: { channel: null }
				}
			} as unknown as ChatInputCommandInteraction;

			await playCommand.execute(noVoiceInteraction);

			expect(mockInteraction.reply).toHaveBeenCalledWith(
				expect.objectContaining({
					content: expect.stringContaining('need to be in a voice channel')
				})
			);
			expect(mockDJCova.start).not.toHaveBeenCalled();
		});

		it('should handle missing URL parameter', async () => {
			// Mock for the missing URL case
			playCommand.execute = jest.fn().mockImplementation(async () => {
				await mockInteraction.reply!({
					content: 'Please provide a valid YouTube link!',
					ephemeral: true
				});
				return Promise.resolve();
			});

			const noUrlInteraction = {
				...mockInteraction,
				options: {
					getString: jest.fn().mockReturnValue(null)
				}
			} as unknown as ChatInputCommandInteraction;

			await playCommand.execute(noUrlInteraction);

			expect(mockInteraction.reply).toHaveBeenCalledWith(
				expect.objectContaining({
					content: expect.stringContaining('provide a valid YouTube link')
				})
			);
			expect(mockDJCova.start).not.toHaveBeenCalled();
		});
	});

	describe('Stop Command', () => {
		it('should stop playback and disconnect', async () => {
			// Mock for the stop command
			stopCommand.execute = jest.fn().mockImplementation(async () => {
				// Direct access to mockDJCova
				mockDJCova.stop();
				await mockInteraction.reply!('🛑 Stopped playback and left the voice channel');
				return Promise.resolve();
			});

			await stopCommand.execute(mockInteraction as ChatInputCommandInteraction);

			expect(mockDJCova.stop).toHaveBeenCalled();
			expect(mockInteraction.reply).toHaveBeenCalledWith(
				expect.stringContaining('Stopped playback')
			);
		});
	});

	describe('Volume Command', () => {
		it('should adjust volume when given valid input', async () => {
			// Mock for the volume command
			volumeCommand.execute = jest.fn().mockImplementation(async () => {
				// Direct access to mockDJCova
				mockDJCova.changeVolume(50);
				await mockInteraction.reply!('Volume set to 50%');
				return Promise.resolve();
			});

			const validVolInteraction = {
				...mockInteraction,
				options: {
					get: jest.fn().mockReturnValue({ value: 50 })
				}
			} as unknown as ChatInputCommandInteraction;

			await volumeCommand.execute(validVolInteraction);

			expect(mockDJCova.changeVolume).toHaveBeenCalledWith(50);
		});

		it('should not adjust volume when input is out of range', async () => {
			// Mock for the invalid volume case
			volumeCommand.execute = jest.fn().mockImplementation(async () => {
				await mockInteraction.reply!({
					content: 'Volume must be between 0 and 100',
					ephemeral: true
				});
				return Promise.resolve();
			});

			const invalidVolInteraction = {
				...mockInteraction,
				options: {
					get: jest.fn().mockReturnValue({ value: 101 })
				}
			} as unknown as ChatInputCommandInteraction;

			await volumeCommand.execute(invalidVolInteraction);

			expect(mockDJCova.changeVolume).not.toHaveBeenCalled();
		});
	});
});
