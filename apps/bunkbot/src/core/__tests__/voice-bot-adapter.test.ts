import { BaseVoiceBot, VoiceBotAdapter } from '../voice-bot-adapter';
import { logger } from '@starbunk/shared';
import { VoiceState } from 'discord.js';

// Mock the logger
jest.mock('@starbunk/shared');

describe('Voice Bot Adapter', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	// Helper to create a mock voice state
	function createMockVoiceState(channelId?: string): VoiceState {
		return {
			channelId,
			channel: channelId
				? {
						id: channelId,
						name: `channel-${channelId}`,
					}
				: null,
			guild: {
				id: 'guild123',
			},
			member: {
				id: 'user123',
				user: {
					username: 'testUser',
					bot: false,
				},
			},
		} as unknown as VoiceState;
	}

	describe('BaseVoiceBot', () => {
		// Create a concrete implementation of BaseVoiceBot for testing
		class TestVoiceBot extends BaseVoiceBot {
			readonly name = 'TestVoiceBot';
			readonly description = 'A test voice bot';
			onVoiceStateUpdateMock = jest.fn();

			async onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
				this.onVoiceStateUpdateMock(oldState, newState);
			}
		}

		it('should provide default volume of 1.0', () => {
			const bot = new TestVoiceBot();
			expect(bot.getVolume()).toBe(1.0);
		});

		it('should update volume with setVolume', () => {
			const bot = new TestVoiceBot();
			bot.setVolume(0.8);

			expect(bot.getVolume()).toBe(0.8);
			expect(logger.debug).toHaveBeenCalledWith(expect.stringMatching(/Volume set to 0.8/));
		});

		it('should clamp volume between 0 and 2.0', () => {
			const bot = new TestVoiceBot();

			// Test clamping to minimum
			bot.setVolume(-0.5);
			expect(bot.getVolume()).toBe(0);

			// Test clamping to maximum
			bot.setVolume(3.0);
			expect(bot.getVolume()).toBe(2.0);
		});
	});

	describe('VoiceBotAdapter', () => {
		it('should wrap a voice bot and delegate method calls', async () => {
			const mockVoiceBot = {
				name: 'MockVoiceBot',
				description: 'A mock voice bot',
				getVolume: jest.fn().mockReturnValue(1.0),
				setVolume: jest.fn(),
				onVoiceStateUpdate: jest.fn().mockResolvedValue(undefined),
			};

			const adapter = new VoiceBotAdapter(mockVoiceBot);

			expect(adapter.name).toBe('MockVoiceBot');
			expect(adapter.description).toBe('A mock voice bot');
			expect(adapter.botIdentity.botName).toBe('MockVoiceBot');
			expect(adapter.botIdentity.avatarUrl).toBe(''); // Placeholder

			// Test volume methods
			expect(adapter.getVolume()).toBe(1.0);
			expect(mockVoiceBot.getVolume).toHaveBeenCalled();

			adapter.setVolume(0.8);
			expect(mockVoiceBot.setVolume).toHaveBeenCalledWith(0.8);

			// Test voice state update
			const oldState = createMockVoiceState();
			const newState = createMockVoiceState('channel123');

			await adapter.onVoiceStateUpdate(oldState, newState);
			expect(mockVoiceBot.onVoiceStateUpdate).toHaveBeenCalledWith(oldState, newState);
		});

		it('should log creation of the adapter', () => {
			const mockVoiceBot = {
				name: 'LoggedVoiceBot',
				description: 'A voice bot that logs creation',
				getVolume: jest.fn().mockReturnValue(1.0),
				setVolume: jest.fn(),
				onVoiceStateUpdate: jest.fn(),
			};

			new VoiceBotAdapter(mockVoiceBot);

			expect(logger.debug).toHaveBeenCalledWith(expect.stringMatching(/Created adapter for LoggedVoiceBot/));
		});

		it('should handle errors in voice state update', async () => {
			const mockVoiceBot = {
				name: 'ErrorVoiceBot',
				description: 'A voice bot that throws errors',
				getVolume: jest.fn().mockReturnValue(1.0),
				setVolume: jest.fn(),
				onVoiceStateUpdate: jest.fn().mockImplementation(() => {
					throw new Error('Test error');
				}),
			};

			const adapter = new VoiceBotAdapter(mockVoiceBot);
			const oldState = createMockVoiceState();
			const newState = createMockVoiceState('channel123');

			await adapter.onVoiceStateUpdate(oldState, newState);

			expect(mockVoiceBot.onVoiceStateUpdate).toHaveBeenCalledWith(oldState, newState);
			expect(logger.error).toHaveBeenCalledWith(
				expect.stringContaining('Error in voice bot state handling'),
				expect.any(Error),
			);
		});
	});
});
