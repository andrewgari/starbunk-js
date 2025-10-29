/**
 * Music command functionality tests for DJCova
 * Tests all music commands with the new simplified architecture
 */

import { CommandInteraction, GuildMember, VoiceBasedChannel } from 'discord.js';
import { AudioPlayer, VoiceConnection } from '@discordjs/voice';
import { container, ServiceId } from '@starbunk/shared';
import { DJCova } from '../src/djCova';
import playCommand from '../src/commands/play';
import stopCommand from '../src/commands/stop';
import volumeCommand from '../src/commands/setVolume';

// Mock dependencies
jest.mock('@starbunk/shared', () => ({
	...jest.requireActual('@starbunk/shared'),
	container: {
		get: jest.fn(),
	},
	sendErrorResponse: jest.fn(),
	sendSuccessResponse: jest.fn(),
	deferInteractionReply: jest.fn(),
}));

jest.mock('../src/utils/voiceUtils', () => ({
	validateVoiceChannelAccess: jest.fn(),
	createVoiceConnection: jest.fn(),
	subscribePlayerToConnection: jest.fn(),
	disconnectVoiceConnection: jest.fn(),
}));

import {
	validateVoiceChannelAccess,
	createVoiceConnection,
	subscribePlayerToConnection,
	disconnectVoiceConnection,
} from '../src/utils/voiceUtils';
import { sendErrorResponse, sendSuccessResponse, deferInteractionReply } from '@starbunk/shared';

describe('Music Commands Tests', () => {
	let mockInteraction: jest.Mocked<CommandInteraction>;
	let mockMusicPlayer: jest.Mocked<DJCova>;
	let mockMember: jest.Mocked<GuildMember>;
	let mockVoiceChannel: jest.Mocked<VoiceBasedChannel>;
	let mockVoiceConnection: jest.Mocked<VoiceConnection>;
	let mockAudioPlayer: jest.Mocked<AudioPlayer>;

	beforeEach(() => {
		jest.clearAllMocks();

		// Mock audio player
		mockAudioPlayer = {
			play: jest.fn(),
			stop: jest.fn(),
			pause: jest.fn(),
		} as any;

		// Mock music player
		mockMusicPlayer = {
			start: jest.fn().mockResolvedValue(undefined),
			stop: jest.fn(),
			changeVolume: jest.fn(),
			getVolume: jest.fn().mockReturnValue(50),
			getPlayer: jest.fn().mockReturnValue(mockAudioPlayer),
			on: jest.fn(),
			subscribe: jest.fn(),
			initializeIdleManagement: jest.fn(),
			disconnect: jest.fn(),
			getIdleStatus: jest.fn().mockReturnValue({ isActive: false, timeoutSeconds: 30 }),
			destroy: jest.fn(),
		} as any;

		// Mock voice channel
		mockVoiceChannel = {
			id: 'voice-channel-id',
			name: 'Test Voice Channel',
			guild: {
				id: 'guild-id',
				voiceAdapterCreator: jest.fn(),
			},
		} as any;

		// Mock guild member
		mockMember = {
			voice: {
				channel: mockVoiceChannel,
			},
		} as any;

		// Mock voice connection
		mockVoiceConnection = {
			subscribe: jest.fn(),
			disconnect: jest.fn(),
		} as any;

		// Mock interaction
		mockInteraction = {
			guild: { id: 'guild-id' },
			member: mockMember,
			options: {
				getString: jest.fn(),
				getAttachment: jest.fn(),
				getInteger: jest.fn(),
			},
			reply: jest.fn().mockResolvedValue(undefined),
			followUp: jest.fn().mockResolvedValue(undefined),
			deferReply: jest.fn().mockResolvedValue(undefined),
			replied: false,
			deferred: false,
		} as any;

		// Setup container mock
		(container.get as jest.Mock).mockImplementation((serviceId) => {
			if (serviceId === ServiceId.MusicPlayer) {
				return mockMusicPlayer;
			}
			return null;
		});

		// Setup voice utils mocks
		(validateVoiceChannelAccess as jest.Mock).mockReturnValue({
			isValid: true,
			member: mockMember,
			voiceChannel: mockVoiceChannel,
		});

		(createVoiceConnection as jest.Mock).mockReturnValue(mockVoiceConnection);
		(subscribePlayerToConnection as jest.Mock).mockReturnValue({});
	});

	describe('Play Command', () => {
		it('should successfully play a YouTube URL', async () => {
			const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
			mockInteraction.options.getString.mockReturnValue(testUrl);

			await playCommand.execute(mockInteraction);

			expect(validateVoiceChannelAccess).toHaveBeenCalledWith(mockInteraction);
			expect(deferInteractionReply).toHaveBeenCalledWith(mockInteraction);
			expect(createVoiceConnection).toHaveBeenCalledWith(
				mockVoiceChannel,
				mockVoiceChannel.guild.voiceAdapterCreator,
			);
			expect(mockMusicPlayer.start).toHaveBeenCalledWith(testUrl);
			expect(subscribePlayerToConnection).toHaveBeenCalledWith(mockVoiceConnection, mockAudioPlayer);
			expect(sendSuccessResponse).toHaveBeenCalledWith(mockInteraction, `🎶 Now playing: ${testUrl}`);
		});

		it('should reject play command without URL', async () => {
			mockInteraction.options.getString.mockReturnValue(null);

			await playCommand.execute(mockInteraction);

			expect(sendErrorResponse).toHaveBeenCalledWith(mockInteraction, 'Please provide a valid YouTube link or audio file!');
			expect(mockMusicPlayer.start).not.toHaveBeenCalled();
		});

		it('should reject play command when user not in voice channel', async () => {
			const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
			mockInteraction.options.getString.mockReturnValue(testUrl);

			(validateVoiceChannelAccess as jest.Mock).mockReturnValue({
				isValid: false,
				errorMessage: 'You need to be in a voice channel to use this command.',
			});

			await playCommand.execute(mockInteraction);

			expect(sendErrorResponse).toHaveBeenCalledWith(
				mockInteraction,
				'You need to be in a voice channel to use this command.',
			);
			expect(mockMusicPlayer.start).not.toHaveBeenCalled();
		});

		it('should handle music player errors gracefully', async () => {
			const testUrl = 'https://www.youtube.com/watch?v=invalid';
			mockInteraction.options.getString.mockReturnValue(testUrl);
			mockMusicPlayer.start.mockRejectedValue(new Error('Invalid URL'));

			await playCommand.execute(mockInteraction);

			expect(sendErrorResponse).toHaveBeenCalledWith(
				mockInteraction,
				'An error occurred while trying to play the music.',
			);
		});
	});

	describe('Stop Command', () => {
		it('should successfully stop music and disconnect', async () => {
			await stopCommand.execute(mockInteraction);

			expect(mockMusicPlayer.disconnect).toHaveBeenCalled();
			expect(disconnectVoiceConnection).toHaveBeenCalledWith('guild-id');
			expect(sendSuccessResponse).toHaveBeenCalledWith(
				mockInteraction,
				'Music stopped and disconnected from voice channel!',
			);
		});

		it('should handle stop command without guild gracefully', async () => {
			mockInteraction.guild = null;

			await stopCommand.execute(mockInteraction);

			expect(mockMusicPlayer.disconnect).toHaveBeenCalled();
			expect(disconnectVoiceConnection).not.toHaveBeenCalled();
			expect(sendSuccessResponse).toHaveBeenCalled();
		});

		it('should handle music player errors during stop', async () => {
			mockMusicPlayer.disconnect.mockImplementation(() => {
				throw new Error('Stop failed');
			});

			await stopCommand.execute(mockInteraction);

			expect(sendErrorResponse).toHaveBeenCalledWith(
				mockInteraction,
				'An error occurred while stopping the music.',
			);
		});
	});

	describe('Volume Command', () => {
		it('should successfully set volume', async () => {
			const testVolume = 75;
			mockInteraction.options.getInteger.mockReturnValue(testVolume);

			await volumeCommand.execute(mockInteraction);

			expect(mockMusicPlayer.changeVolume).toHaveBeenCalledWith(testVolume);
			expect(sendSuccessResponse).toHaveBeenCalledWith(mockInteraction, `🔊 Volume set to ${testVolume}%!`);
		});

		it('should reject invalid volume values', async () => {
			const invalidVolume = 150;
			mockInteraction.options.getInteger.mockReturnValue(invalidVolume);

			await volumeCommand.execute(mockInteraction);

			expect(sendErrorResponse).toHaveBeenCalledWith(mockInteraction, 'Volume must be between 1 and 100!');
			expect(mockMusicPlayer.changeVolume).not.toHaveBeenCalled();
		});

		it('should reject volume command without value', async () => {
			mockInteraction.options.getInteger.mockReturnValue(null);

			await volumeCommand.execute(mockInteraction);

			expect(sendErrorResponse).toHaveBeenCalledWith(mockInteraction, 'Volume must be between 1 and 100!');
			expect(mockMusicPlayer.changeVolume).not.toHaveBeenCalled();
		});

		it('should handle volume change errors', async () => {
			const testVolume = 50;
			mockInteraction.options.getInteger.mockReturnValue(testVolume);
			mockMusicPlayer.changeVolume.mockImplementation(() => {
				throw new Error('Volume change failed');
			});

			await volumeCommand.execute(mockInteraction);

			expect(sendErrorResponse).toHaveBeenCalledWith(
				mockInteraction,
				'An error occurred while changing the volume.',
			);
		});
	});
});
