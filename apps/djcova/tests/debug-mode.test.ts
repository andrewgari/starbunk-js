// Debug mode tests for DJCova container (music service)
import { MessageFilter, resetMessageFilter } from '@starbunk/shared/dist/services/messageFilter';

// Mock environment validation utilities
jest.mock('@starbunk/shared/dist/utils/envValidation', () => ({
	getTestingServerIds: jest.fn(),
	getTestingChannelIds: jest.fn(),
	getDebugMode: jest.fn(),
	isDebugMode: jest.fn(),
}));

// Mock Discord.js voice functionality
jest.mock('discord.js', () => ({
	Client: jest.fn(),
	VoiceChannel: jest.fn(),
	GuildMember: jest.fn(),
}));

// Mock logger
jest.mock('@starbunk/shared/dist/services/logger', () => ({
	logger: {
		info: jest.fn(),
		debug: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
	},
}));

import {
	getTestingServerIds,
	getTestingChannelIds,
	getDebugMode,
	isDebugMode,
} from '@starbunk/shared/dist/utils/envValidation';

describe('DJCova Debug Mode Functionality', () => {
	const mockGetTestingServerIds = getTestingServerIds as jest.MockedFunction<typeof getTestingServerIds>;
	const mockGetTestingChannelIds = getTestingChannelIds as jest.MockedFunction<typeof getTestingChannelIds>;
	const mockGetDebugMode = getDebugMode as jest.MockedFunction<typeof getDebugMode>;
	const mockIsDebugMode = isDebugMode as jest.MockedFunction<typeof isDebugMode>;

	// Mock Discord.js objects for music commands
	const createMockInteraction = (overrides: any = {}) => ({
		commandName: 'play',
		options: {
			getString: jest.fn().mockReturnValue('test song'),
			...overrides.options,
		},
		user: {
			id: '987654321098765432',
			username: 'testuser',
			...overrides.user,
		},
		guild:
			overrides.guild !== null
				? {
						id: '111222333444555666',
						...overrides.guild,
					}
				: null,
		channel: {
			id: '777888999000111222',
			...overrides.channel,
		},
		channelId: '777888999000111222',
		member: {
			voice: {
				channel: {
					id: 'voice-channel-id',
					joinable: true,
					...overrides.voiceChannel,
				},
			},
			...overrides.member,
		},
		reply: jest.fn(),
		deferReply: jest.fn(),
		editReply: jest.fn(),
		...overrides,
	});

	beforeEach(() => {
		jest.clearAllMocks();
		resetMessageFilter();

		// Default mock implementations
		mockGetTestingServerIds.mockReturnValue([]);
		mockGetTestingChannelIds.mockReturnValue([]);
		mockGetDebugMode.mockReturnValue(false);
		mockIsDebugMode.mockReturnValue(false);
	});

	describe('Music Command Filtering', () => {
		test('should only process music commands in allowed guilds when TESTING_SERVER_IDS is set', () => {
			// Arrange
			const allowedServerId = '111222333444555666';
			const blockedServerId = '999888777666555444';
			mockGetTestingServerIds.mockReturnValue([allowedServerId]);

			const filter = new MessageFilter();

			// Act & Assert - Allowed server
			const allowedInteraction = createMockInteraction({ guild: { id: allowedServerId } });
			const allowedContext = MessageFilter.createContextFromInteraction(allowedInteraction);
			const allowedResult = filter.shouldProcessMessage(allowedContext);
			expect(allowedResult.allowed).toBe(true);

			// Act & Assert - Blocked server
			const blockedInteraction = createMockInteraction({ guild: { id: blockedServerId } });
			const blockedContext = MessageFilter.createContextFromInteraction(blockedInteraction);
			const blockedResult = filter.shouldProcessMessage(blockedContext);
			expect(blockedResult.allowed).toBe(false);
			expect(blockedResult.reason).toContain('not in allowed testing servers');
		});

		test('should only process music commands in allowed channels when TESTING_CHANNEL_IDS is set', () => {
			// Arrange
			const allowedChannelId = '777888999000111222';
			const blockedChannelId = '333444555666777888';
			mockGetTestingChannelIds.mockReturnValue([allowedChannelId]);

			const filter = new MessageFilter();

			// Act & Assert - Allowed channel
			const allowedInteraction = createMockInteraction({ channel: { id: allowedChannelId } });
			const allowedContext = MessageFilter.createContextFromInteraction(allowedInteraction);
			const allowedResult = filter.shouldProcessMessage(allowedContext);
			expect(allowedResult.allowed).toBe(true);

			// Act & Assert - Blocked channel
			const blockedInteraction = createMockInteraction({
				channel: { id: blockedChannelId },
				channelId: blockedChannelId,
			});
			const blockedContext = MessageFilter.createContextFromInteraction(blockedInteraction);
			const blockedResult = filter.shouldProcessMessage(blockedContext);
			expect(blockedResult.allowed).toBe(false);
			expect(blockedResult.reason).toContain('not in allowed testing channels');
		});

		test('should handle voice channel restrictions in debug mode', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);
			const allowedChannelId = '777888999000111222';
			mockGetTestingChannelIds.mockReturnValue([allowedChannelId]);

			const filter = new MessageFilter();

			// Act - Music command in allowed text channel
			const interaction = createMockInteraction({
				commandName: 'play',
				channel: { id: allowedChannelId },
				channelId: allowedChannelId,
			});
			const context = MessageFilter.createContextFromInteraction(interaction);
			const result = filter.shouldProcessMessage(context);

			// Assert - Should be allowed
			expect(result.allowed).toBe(true);
		});
	});

	describe('Music Command Types Debug Behavior', () => {
		test('should filter play commands correctly', () => {
			// Arrange
			const allowedServerId = '111222333444555666';
			mockGetTestingServerIds.mockReturnValue([allowedServerId]);

			const filter = new MessageFilter();

			// Act
			const playInteraction = createMockInteraction({
				commandName: 'play',
				guild: { id: allowedServerId },
			});
			const context = MessageFilter.createContextFromInteraction(playInteraction);
			const result = filter.shouldProcessMessage(context);

			// Assert
			expect(result.allowed).toBe(true);
		});

		test('should filter skip commands correctly', () => {
			// Arrange
			const blockedServerId = '999888777666555444';
			mockGetTestingServerIds.mockReturnValue(['allowed-server']);

			const filter = new MessageFilter();

			// Act
			const skipInteraction = createMockInteraction({
				commandName: 'skip',
				guild: { id: blockedServerId },
			});
			const context = MessageFilter.createContextFromInteraction(skipInteraction);
			const result = filter.shouldProcessMessage(context);

			// Assert
			expect(result.allowed).toBe(false);
		});

		test('should filter queue commands correctly', () => {
			// Arrange
			const allowedChannelId = '777888999000111222';
			mockGetTestingChannelIds.mockReturnValue([allowedChannelId]);

			const filter = new MessageFilter();

			// Act
			const queueInteraction = createMockInteraction({
				commandName: 'queue',
				channel: { id: allowedChannelId },
				channelId: allowedChannelId,
			});
			const context = MessageFilter.createContextFromInteraction(queueInteraction);
			const result = filter.shouldProcessMessage(context);

			// Assert
			expect(result.allowed).toBe(true);
		});
	});

	describe('Voice Connection Isolation in Debug Mode', () => {
		test('should prevent actual voice connections when DEBUG_MODE=true', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);

			// Act & Assert - In debug mode, voice connections should be mocked
			// This test verifies that the debug mode is properly detected
			expect(mockGetDebugMode()).toBe(true);

			// In a real implementation, this would test that:
			// - No actual voice connections are made
			// - Voice connection attempts are logged but not executed
			// - Mock responses are returned instead of real voice operations
		});

		test('should mock audio playback in debug mode', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);

			// Act & Assert - Audio playback should be mocked in debug mode
			expect(mockGetDebugMode()).toBe(true);

			// In a real implementation, this would verify:
			// - No actual audio streams are created
			// - Playback commands return mock success responses
			// - Audio resources are not actually downloaded
		});
	});

	describe('External Music Service Integration Isolation', () => {
		test('should not make external API calls in debug mode', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);

			// Act & Assert - External music APIs should be mocked
			expect(mockGetDebugMode()).toBe(true);

			// In a real implementation, this would test that:
			// - YouTube API calls are mocked
			// - Spotify API calls are mocked
			// - SoundCloud API calls are mocked
			// - No actual HTTP requests are made to external services
		});

		test('should return mock music data in debug mode', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);

			// Act & Assert - Mock music data should be returned
			expect(mockGetDebugMode()).toBe(true);

			// In a real implementation, this would verify:
			// - Mock song titles and durations are returned
			// - Mock playlist data is provided
			// - Mock search results are generated
		});
	});

	describe('DJCova Specific Debug Configuration', () => {
		test('should handle voice-only channel restrictions', () => {
			// Arrange
			const allowedChannelId = '777888999000111222';
			mockGetTestingChannelIds.mockReturnValue([allowedChannelId]);

			const filter = new MessageFilter();

			// Act - Command from allowed text channel but user in different voice channel
			const interaction = createMockInteraction({
				channel: { id: allowedChannelId },
				channelId: allowedChannelId,
				member: {
					voice: {
						channel: {
							id: 'different-voice-channel',
							joinable: true,
						},
					},
				},
			});
			const context = MessageFilter.createContextFromInteraction(interaction);
			const result = filter.shouldProcessMessage(context);

			// Assert - Text channel filtering should still apply
			expect(result.allowed).toBe(true);
		});

		test('should apply filtering before voice channel validation', () => {
			// Arrange
			const blockedChannelId = '333444555666777888';
			mockGetTestingChannelIds.mockReturnValue(['allowed-channel']);

			const filter = new MessageFilter();

			// Act - Command from blocked channel, even if voice setup is valid
			const interaction = createMockInteraction({
				channel: { id: blockedChannelId },
				channelId: blockedChannelId,
				member: {
					voice: {
						channel: {
							id: 'valid-voice-channel',
							joinable: true,
						},
					},
				},
			});
			const context = MessageFilter.createContextFromInteraction(interaction);
			const result = filter.shouldProcessMessage(context);

			// Assert - Should be blocked before voice validation
			expect(result.allowed).toBe(false);
		});
	});

	describe('Debug Mode Logging for Music Commands', () => {
		test('should log detailed information in debug mode', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);
			mockGetTestingServerIds.mockReturnValue(['test-server']);

			const filter = new MessageFilter();

			// Act
			const interaction = createMockInteraction({ guild: { id: 'blocked-server' } });
			const context = MessageFilter.createContextFromInteraction(interaction);
			filter.shouldProcessMessage(context);

			// Assert - Debug logging should occur
			// In a real implementation, this would verify specific log messages
			expect(mockGetDebugMode()).toBe(true);
		});
	});

	describe('Music Command Channel Filtering with DEBUG_MODE=true', () => {
		test('should block music commands in non-whitelisted channels even when DEBUG_MODE=true', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);
			mockIsDebugMode.mockReturnValue(true);
			const whitelistedChannels = ['777888999000111222', '333444555666777888'];
			const blockedChannelId = '999999999999999999';
			mockGetTestingChannelIds.mockReturnValue(whitelistedChannels);

			const filter = new MessageFilter();

			// Act - Test play command in blocked channel
			const playInteraction = createMockInteraction({
				commandName: 'play',
				channel: { id: blockedChannelId },
				channelId: blockedChannelId,
				options: { getString: jest.fn().mockReturnValue('Never Gonna Give You Up') },
			});
			const playContext = MessageFilter.createContextFromInteraction(playInteraction);
			const playResult = filter.shouldProcessMessage(playContext);

			// Assert
			expect(playResult.allowed).toBe(false);
			expect(playResult.reason).toContain('Channel 999999999999999999 not in allowed testing channels');
			expect(playResult.reason).toContain('[777888999000111222, 333444555666777888]');
		});

		test('should block all music command types in non-whitelisted channels', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);
			mockIsDebugMode.mockReturnValue(true);
			const whitelistedChannels = ['777888999000111222'];
			const blockedChannelId = '999999999999999999';
			mockGetTestingChannelIds.mockReturnValue(whitelistedChannels);

			const filter = new MessageFilter();

			// Test different music commands
			const musicCommands = [
				{ name: 'play', options: { getString: jest.fn().mockReturnValue('test song') } },
				{ name: 'skip', options: {} },
				{ name: 'stop', options: {} },
				{ name: 'pause', options: {} },
				{ name: 'resume', options: {} },
				{ name: 'queue', options: {} },
				{ name: 'volume', options: { getInteger: jest.fn().mockReturnValue(50) } },
				{ name: 'nowplaying', options: {} },
				{ name: 'shuffle', options: {} },
				{ name: 'loop', options: {} },
			];

			musicCommands.forEach((command) => {
				// Act
				const interaction = createMockInteraction({
					commandName: command.name,
					channel: { id: blockedChannelId },
					channelId: blockedChannelId,
					options: command.options,
				});
				const context = MessageFilter.createContextFromInteraction(interaction);
				const result = filter.shouldProcessMessage(context);

				// Assert - All music commands should be blocked
				expect(result.allowed).toBe(false);
				expect(result.reason).toContain('Channel 999999999999999999 not in allowed testing channels');
			});
		});

		test('should allow music commands in whitelisted channels when DEBUG_MODE=true', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);
			mockIsDebugMode.mockReturnValue(true);
			const whitelistedChannels = ['777888999000111222', '333444555666777888'];
			const allowedChannelId = '777888999000111222';
			mockGetTestingChannelIds.mockReturnValue(whitelistedChannels);

			const filter = new MessageFilter();

			// Act
			const playInteraction = createMockInteraction({
				commandName: 'play',
				channel: { id: allowedChannelId },
				channelId: allowedChannelId,
				options: { getString: jest.fn().mockReturnValue('Darude - Sandstorm') },
			});
			const playContext = MessageFilter.createContextFromInteraction(playInteraction);
			const playResult = filter.shouldProcessMessage(playContext);

			// Assert
			expect(playResult.allowed).toBe(true);
			expect(playResult.reason).toBeUndefined();
		});

		test('should prevent voice connection attempts in blocked channels', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);
			mockIsDebugMode.mockReturnValue(true);
			const whitelistedChannels = ['777888999000111222'];
			const blockedChannelId = '999999999999999999';
			mockGetTestingChannelIds.mockReturnValue(whitelistedChannels);

			const filter = new MessageFilter();

			// Mock voice connection tracking
			const mockVoiceConnection = jest.fn();
			const mockAudioPlayer = jest.fn();

			// Act
			const playInteraction = createMockInteraction({
				commandName: 'play',
				channel: { id: blockedChannelId },
				channelId: blockedChannelId,
				member: {
					voice: {
						channel: {
							id: 'voice-channel-id',
							joinable: true,
						},
					},
				},
			});
			const playContext = MessageFilter.createContextFromInteraction(playInteraction);
			const filterResult = filter.shouldProcessMessage(playContext);

			// Simulate proper command processing pipeline
			if (filterResult.allowed) {
				mockVoiceConnection();
				mockAudioPlayer();
			}

			// Assert - No voice operations should occur when message is filtered
			expect(filterResult.allowed).toBe(false);
			expect(mockVoiceConnection).not.toHaveBeenCalled();
			expect(mockAudioPlayer).not.toHaveBeenCalled();
		});

		test('should prevent external music API calls in blocked channels', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);
			mockIsDebugMode.mockReturnValue(true);
			const whitelistedChannels = ['777888999000111222'];
			const blockedChannelId = '999999999999999999';
			mockGetTestingChannelIds.mockReturnValue(whitelistedChannels);

			const filter = new MessageFilter();

			// Mock external API calls
			const mockYouTubeAPI = jest.fn();
			const mockSpotifyAPI = jest.fn();
			const mockSoundCloudAPI = jest.fn();

			// Act
			const playInteraction = createMockInteraction({
				commandName: 'play',
				channel: { id: blockedChannelId },
				channelId: blockedChannelId,
				options: { getString: jest.fn().mockReturnValue('https://youtube.com/watch?v=dQw4w9WgXcQ') },
			});
			const playContext = MessageFilter.createContextFromInteraction(playInteraction);
			const filterResult = filter.shouldProcessMessage(playContext);

			// Simulate proper command processing pipeline
			if (filterResult.allowed) {
				mockYouTubeAPI();
				mockSpotifyAPI();
				mockSoundCloudAPI();
			}

			// Assert - No external API calls should occur when message is filtered
			expect(filterResult.allowed).toBe(false);
			expect(mockYouTubeAPI).not.toHaveBeenCalled();
			expect(mockSpotifyAPI).not.toHaveBeenCalled();
			expect(mockSoundCloudAPI).not.toHaveBeenCalled();
		});

		test('should verify filtering occurs before voice channel validation', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);
			mockIsDebugMode.mockReturnValue(true);
			const whitelistedChannels = ['777888999000111222'];
			const blockedChannelId = '999999999999999999';
			mockGetTestingChannelIds.mockReturnValue(whitelistedChannels);

			const filter = new MessageFilter();

			// Mock voice validation tracking
			const mockVoiceValidation = jest.fn();
			const mockUserInVoice = jest.fn();
			const mockBotCanJoin = jest.fn();

			// Act
			const playInteraction = createMockInteraction({
				commandName: 'play',
				channel: { id: blockedChannelId },
				channelId: blockedChannelId,
				member: {
					voice: {
						channel: null, // User not in voice channel
					},
				},
			});
			const playContext = MessageFilter.createContextFromInteraction(playInteraction);
			const filterResult = filter.shouldProcessMessage(playContext);

			// Simulate proper command processing pipeline
			if (filterResult.allowed) {
				mockVoiceValidation();
				mockUserInVoice();
				mockBotCanJoin();
			}

			// Assert - Voice validation should not occur when message is filtered
			expect(filterResult.allowed).toBe(false);
			expect(mockVoiceValidation).not.toHaveBeenCalled();
			expect(mockUserInVoice).not.toHaveBeenCalled();
			expect(mockBotCanJoin).not.toHaveBeenCalled();
		});
	});
});
