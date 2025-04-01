import { createVoiceBot } from '../voice-bot-builder';
import { mockBotIdentity } from '../../test-utils/testUtils';
import { logger } from '../../../../services/logger';
import { VoiceState } from 'discord.js';

// Mock the logger
jest.mock('../../../../services/logger');

describe('Voice Bot Builder', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	// Helper to create a mock voice state
	function createMockVoiceState(channelId?: string): VoiceState {
		return {
			channelId,
			channel: channelId ? {
				id: channelId,
				name: `channel-${channelId}`
			} : null,
			guild: {
				id: 'guild123'
			},
			member: {
				id: 'user123',
				user: {
					username: 'testUser',
					bot: false
				}
			}
		} as unknown as VoiceState;
	}

	describe('createVoiceBot', () => {
		it('should create a voice bot with the given config', () => {
			const config = {
				name: 'VoiceBot',
				description: 'A test voice bot',
				defaultIdentity: mockBotIdentity,
				triggers: [
					{
						name: 'test-trigger',
						condition: jest.fn().mockResolvedValue(false),
						response: jest.fn().mockResolvedValue(undefined),
						priority: 10
					}
				],
				volume: 0.8
			};

			const bot = createVoiceBot(config);
			
			expect(bot.name).toBe('VoiceBot');
			expect(bot.description).toBe('A test voice bot');
			expect(bot.getVolume()).toBe(0.8);
		});

		it('should use default volume of 1.0 if not specified', () => {
			const config = {
				name: 'DefaultVolumeBot',
				description: 'A test voice bot',
				defaultIdentity: mockBotIdentity,
				triggers: [
					{
						name: 'test-trigger',
						condition: jest.fn().mockResolvedValue(false),
						response: jest.fn().mockResolvedValue(undefined)
					}
				]
				// No volume specified
			};

			const bot = createVoiceBot(config);
			expect(bot.getVolume()).toBe(1.0);
		});

		describe('getVolume', () => {
			it('should return the current volume', () => {
				const config = {
					name: 'VolumeBot',
					description: 'A test voice bot',
					defaultIdentity: mockBotIdentity,
					triggers: [
						{
							name: 'test-trigger',
							condition: jest.fn(),
							response: jest.fn()
						}
					],
					volume: 0.5
				};

				const bot = createVoiceBot(config);
				expect(bot.getVolume()).toBe(0.5);
			});
		});

		describe('setVolume', () => {
			it('should update the volume', () => {
				const config = {
					name: 'VolumeBot',
					description: 'A test voice bot',
					defaultIdentity: mockBotIdentity,
					triggers: [
						{
							name: 'test-trigger',
							condition: jest.fn(),
							response: jest.fn()
						}
					],
					volume: 0.5
				};

				const bot = createVoiceBot(config);
				bot.setVolume(0.8);
				
				expect(bot.getVolume()).toBe(0.8);
				expect(logger.debug).toHaveBeenCalledWith(
					expect.stringMatching(/Volume set to 0.8/)
				);
			});

			it('should clamp volume between 0 and 2.0', () => {
				const config = {
					name: 'VolumeBot',
					description: 'A test voice bot',
					defaultIdentity: mockBotIdentity,
					triggers: [
						{
							name: 'test-trigger',
							condition: jest.fn(),
							response: jest.fn()
						}
					],
					volume: 1.0
				};

				const bot = createVoiceBot(config);
				
				// Test clamping to minimum
				bot.setVolume(-0.5);
				expect(bot.getVolume()).toBe(0);
				
				// Test clamping to maximum
				bot.setVolume(3.0);
				expect(bot.getVolume()).toBe(2.0);
			});
		});

		describe('onVoiceStateUpdate', () => {
			it('should process voice state updates and match triggers', async () => {
				const matchingTrigger = {
					name: 'matching-trigger',
					condition: jest.fn().mockResolvedValue(true),
					response: jest.fn().mockResolvedValue(undefined),
					priority: 5
				};

				const nonMatchingTrigger = {
					name: 'non-matching-trigger',
					condition: jest.fn().mockResolvedValue(false),
					response: jest.fn().mockResolvedValue(undefined),
					priority: 10
				};

				const config = {
					name: 'VoiceBot',
					description: 'A test voice bot',
					defaultIdentity: mockBotIdentity,
					triggers: [nonMatchingTrigger, matchingTrigger]
				};

				const bot = createVoiceBot(config);
				const oldState = createMockVoiceState();
				const newState = createMockVoiceState('channel123');
				
				await bot.onVoiceStateUpdate(oldState, newState);
				
				// Should check both triggers but only call response on the matching one
				expect(nonMatchingTrigger.condition).toHaveBeenCalledWith(oldState, newState);
				expect(nonMatchingTrigger.response).not.toHaveBeenCalled();
				expect(matchingTrigger.condition).toHaveBeenCalledWith(oldState, newState);
				expect(matchingTrigger.response).toHaveBeenCalledWith(oldState, newState);
				expect(logger.debug).toHaveBeenCalledWith(
					expect.stringMatching(/Trigger "matching-trigger" matched/)
				);
			});

			it('should sort triggers by priority', async () => {
				const highPriorityTrigger = {
					name: 'high-priority',
					condition: jest.fn().mockResolvedValue(true),
					response: jest.fn().mockResolvedValue(undefined),
					priority: 10
				};

				const lowPriorityTrigger = {
					name: 'low-priority',
					condition: jest.fn().mockResolvedValue(true),
					response: jest.fn().mockResolvedValue(undefined),
					priority: 1
				};

				const config = {
					name: 'PriorityBot',
					description: 'A test voice bot',
					defaultIdentity: mockBotIdentity,
					triggers: [lowPriorityTrigger, highPriorityTrigger] // Order in array doesn't matter
				};

				const bot = createVoiceBot(config);
				const oldState = createMockVoiceState();
				const newState = createMockVoiceState('channel123');
				
				await bot.onVoiceStateUpdate(oldState, newState);
				
				// Should check high priority first and short-circuit
				expect(highPriorityTrigger.condition).toHaveBeenCalledWith(oldState, newState);
				expect(highPriorityTrigger.response).toHaveBeenCalledWith(oldState, newState);
				expect(lowPriorityTrigger.condition).not.toHaveBeenCalled();
				expect(lowPriorityTrigger.response).not.toHaveBeenCalled();
			});

			it('should handle errors in trigger conditions', async () => {
				const errorTrigger = {
					name: 'error-trigger',
					condition: jest.fn().mockImplementation(() => {
						throw new Error('Test error');
					}),
					response: jest.fn().mockResolvedValue(undefined),
					priority: 10
				};

				const fallbackTrigger = {
					name: 'fallback-trigger',
					condition: jest.fn().mockResolvedValue(true),
					response: jest.fn().mockResolvedValue(undefined),
					priority: 5
				};

				const config = {
					name: 'ErrorBot',
					description: 'A test voice bot',
					defaultIdentity: mockBotIdentity,
					triggers: [errorTrigger, fallbackTrigger]
				};

				const bot = createVoiceBot(config);
				const oldState = createMockVoiceState();
				const newState = createMockVoiceState('channel123');
				
				await bot.onVoiceStateUpdate(oldState, newState);
				
				// Should log the error and continue to the next trigger
				expect(errorTrigger.condition).toHaveBeenCalledWith(oldState, newState);
				expect(errorTrigger.response).not.toHaveBeenCalled();
				expect(logger.error).toHaveBeenCalledWith(
					expect.stringContaining('Error in voice trigger'),
					expect.any(Error)
				);
				
				// Should fall back to the next trigger
				expect(fallbackTrigger.condition).toHaveBeenCalledWith(oldState, newState);
				expect(fallbackTrigger.response).toHaveBeenCalledWith(oldState, newState);
			});

			it('should handle errors in trigger responses', async () => {
				const trigger = {
					name: 'response-error-trigger',
					condition: jest.fn().mockResolvedValue(true),
					response: jest.fn().mockImplementation(() => {
						throw new Error('Response error');
					}),
					priority: 10
				};

				const config = {
					name: 'ResponseErrorBot',
					description: 'A test voice bot',
					defaultIdentity: mockBotIdentity,
					triggers: [trigger]
				};

				const bot = createVoiceBot(config);
				const oldState = createMockVoiceState();
				const newState = createMockVoiceState('channel123');
				
				await bot.onVoiceStateUpdate(oldState, newState);
				
				// Should log the error
				expect(trigger.condition).toHaveBeenCalledWith(oldState, newState);
				expect(trigger.response).toHaveBeenCalledWith(oldState, newState);
				expect(logger.error).toHaveBeenCalledWith(
					expect.stringContaining('Error in voice trigger'),
					expect.any(Error)
				);
			});
		});
	});
});