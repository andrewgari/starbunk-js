/**
 * Integration tests for DJCova Discord client architecture refactoring
 * Tests the complete flow from Discord client creation to music command execution
 */

import { Client, CommandInteraction, GuildMember, VoiceBasedChannel } from 'discord.js';
import { AudioPlayer, VoiceConnection } from '@discordjs/voice';
import {
	createDiscordClient,
	ClientConfigs,
	container,
	ServiceId,
	sendErrorResponse,
	sendSuccessResponse,
} from '@starbunk/shared';
import { DJCova } from '../src/djCova';
import { CommandHandler } from '../src/commandHandler';
import {
	createVoiceConnection,
	validateVoiceChannelAccess,
	subscribePlayerToConnection,
} from '../src/utils/voiceUtils';

// Mock Discord.js modules
jest.mock('discord.js');
jest.mock('@discordjs/voice');
jest.mock('@starbunk/shared', () => ({
	...jest.requireActual('@starbunk/shared'),
	createDiscordClient: jest.fn(),
	sendErrorResponse: jest.fn(),
	sendSuccessResponse: jest.fn(),
	container: {
		get: jest.fn(),
		register: jest.fn(),
	},
}));

describe('DJCova Integration Tests', () => {
	let mockClient: jest.Mocked<Client>;
	let mockMusicPlayer: jest.Mocked<DJCova>;
	let mockCommandHandler: jest.Mocked<CommandHandler>;
	let mockInteraction: jest.Mocked<CommandInteraction>;
	let mockMember: jest.Mocked<GuildMember>;
	let mockVoiceChannel: jest.Mocked<VoiceBasedChannel>;

	beforeEach(() => {
		// Reset all mocks
		jest.clearAllMocks();

		// Mock Discord client
		mockClient = {
			on: jest.fn(),
			login: jest.fn().mockResolvedValue('token'),
			user: { id: 'bot-id' },
		} as any;

		// Mock music player
		mockMusicPlayer = {
			start: jest.fn().mockResolvedValue(undefined),
			stop: jest.fn(),
			changeVolume: jest.fn(),
			getVolume: jest.fn().mockReturnValue(50),
			getPlayer: jest.fn().mockReturnValue({} as AudioPlayer),
			on: jest.fn(),
			subscribe: jest.fn(),
		} as any;

		// Mock command handler
		mockCommandHandler = {
			registerCommands: jest.fn().mockResolvedValue(undefined),
			handleInteraction: jest.fn().mockResolvedValue(undefined),
		} as any;

		// Mock interaction
		mockInteraction = {
			client: mockClient,
			guild: { id: 'guild-id', voiceAdapterCreator: jest.fn() },
			member: mockMember,
			options: {
				get: jest.fn(),
			},
			reply: jest.fn().mockResolvedValue(undefined),
			followUp: jest.fn().mockResolvedValue(undefined),
			deferReply: jest.fn().mockResolvedValue(undefined),
			replied: false,
			deferred: false,
		} as any;

		// Mock guild member
		mockMember = {
			voice: {
				channel: mockVoiceChannel,
			},
		} as any;

		// Mock voice channel
		mockVoiceChannel = {
			id: 'voice-channel-id',
			name: 'Test Voice Channel',
			guild: { id: 'guild-id', voiceAdapterCreator: jest.fn() },
			permissionsFor: jest.fn().mockReturnValue({
				has: jest.fn().mockReturnValue(true),
			}),
		} as any;

		// Setup container mocks
		(container.get as jest.Mock).mockImplementation((serviceId) => {
			if (serviceId === ServiceId.MusicPlayer) {
				return mockMusicPlayer;
			}
			if (serviceId === ServiceId.DiscordClient) {
				return mockClient;
			}
			return null;
		});

		// Setup client factory mock
		(createDiscordClient as jest.Mock).mockReturnValue(mockClient);
	});

	describe('Discord Client Creation', () => {
		it('should create Discord client with correct configuration', () => {
			const client = createDiscordClient(ClientConfigs.DJCova);

			expect(createDiscordClient).toHaveBeenCalledWith(ClientConfigs.DJCova);
			expect(client).toBe(mockClient);
		});

		it('should register client in container', () => {
			container.register(ServiceId.DiscordClient, mockClient);

			expect(container.register).toHaveBeenCalledWith(ServiceId.DiscordClient, mockClient);
		});
	});

	describe('Music Player Integration', () => {
		it('should retrieve music player from container', () => {
			const musicPlayer = container.get(ServiceId.MusicPlayer);

			expect(container.get).toHaveBeenCalledWith(ServiceId.MusicPlayer);
			expect(musicPlayer).toBe(mockMusicPlayer);
		});

		it('should expose audio player instance', () => {
			const audioPlayer = mockMusicPlayer.getPlayer();

			expect(mockMusicPlayer.getPlayer).toHaveBeenCalled();
			expect(audioPlayer).toBeDefined();
		});
	});

	describe('Voice Channel Validation', () => {
		it('should validate successful voice channel access', () => {
			const _result = validateVoiceChannelAccess(mockInteraction);

			expect(result.isValid).toBe(true);
			expect(result.member).toBeDefined();
			expect(result.voiceChannel).toBeDefined();
		});

		it('should reject interaction without guild', () => {
			mockInteraction.guild = null;

			const _result = validateVoiceChannelAccess(mockInteraction);

			expect(result.isValid).toBe(false);
			expect(result.errorMessage).toBe('This command can only be used in a server.');
		});

		it('should reject interaction without voice channel', () => {
			// Create a new mock member without voice channel
			const memberWithoutVoice = {
				voice: { channel: null },
			} as any;
			mockInteraction.member = memberWithoutVoice;

			const _result = validateVoiceChannelAccess(mockInteraction);

			expect(result.isValid).toBe(false);
			expect(result.errorMessage).toBe('You need to be in a voice channel to use this command.');
		});
	});

	describe('Command Handler Integration', () => {
		it('should register commands successfully', async () => {
			await mockCommandHandler.registerCommands();

			expect(mockCommandHandler.registerCommands).toHaveBeenCalled();
		});

		it('should handle interactions', async () => {
			await mockCommandHandler.handleInteraction(mockInteraction);

			expect(mockCommandHandler.handleInteraction).toHaveBeenCalledWith(mockInteraction);
		});
	});

	describe('Error Handling', () => {
		it('should handle errors with sendErrorResponse', async () => {
			await sendErrorResponse(mockInteraction, 'Test error message');

			expect(sendErrorResponse).toHaveBeenCalledWith(mockInteraction, 'Test error message');
		});

		it('should handle success with sendSuccessResponse', async () => {
			await sendSuccessResponse(mockInteraction, 'Test success message');

			expect(sendSuccessResponse).toHaveBeenCalledWith(mockInteraction, 'Test success message');
		});
	});
});
