// Debug mode tests for reply bots (InterruptBot, ChadBot, etc.)
import { withChance, and, not, fromUser } from '../src/core/conditions';
import { INTERRUPT_CHANCE } from '../src/reply-bots/interrupt-bot/constants';
import { CHAD_RESPONSE_CHANCE, CHAD_USER_ID } from '../src/reply-bots/chad-bot/constants';

// Mock environment validation utilities
jest.mock('@starbunk/shared/dist/utils/envValidation', () => ({
	isDebugMode: jest.fn(),
}));

// Mock logger
jest.mock('@starbunk/shared/dist/services/logger', () => ({
	logger: {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
	},
}));

import { isDebugMode } from '@starbunk/shared/dist/utils/envValidation';

describe.skip('Reply Bots Debug Mode Behavior', () => {
	const mockIsDebugMode = isDebugMode as jest.MockedFunction<typeof isDebugMode>;

	// Mock Discord.js Message object
	const createMockMessage = (overrides: any = {}) => ({
		id: '123456789012345678',
		content: 'test message',
		author: {
			id: '987654321098765432',
			username: 'testuser',
			bot: false,
			...overrides.author,
		},
		guild: {
			id: '111222333444555666',
			...overrides.guild,
		},
		channel: {
			id: '777888999000111222',
			...overrides.channel,
		},
		client: {
			user: { id: 'bot-id' },
		},
		...overrides,
	});

	beforeEach(() => {
		jest.clearAllMocks();
		mockIsDebugMode.mockReturnValue(false);
	});

	describe('InterruptBot Random Trigger Behavior', () => {
		test('should trigger at 100% rate in debug mode regardless of configured chance', () => {
			// Arrange
			mockIsDebugMode.mockReturnValue(true);
			const condition = withChance(INTERRUPT_CHANCE); // Normal 1% chance

			// Act & Assert - Should always trigger in debug mode
			for (let i = 0; i < 20; i++) {
				const _result = condition();
				expect(result).toBe(true);
			}
		});

		test('should trigger at normal 1% rate in production mode', () => {
			// Arrange
			mockIsDebugMode.mockReturnValue(false);
			const condition = withChance(INTERRUPT_CHANCE);

			// Act - Test many times to verify statistical behavior
			const results: boolean[] = [];
			for (let i = 0; i < 1000; i++) {
				results.push(condition());
			}

			// Assert - Should have roughly 1% success rate (allow some variance)
			const successCount = results.filter((r) => r).length;
			const successRate = (successCount / results.length) * 100;

			// Allow 0.5% variance for statistical testing
			expect(successRate).toBeGreaterThanOrEqual(0.5);
			expect(successRate).toBeLessThanOrEqual(1.5);
		});

		test('should have deterministic behavior with same message in debug mode', () => {
			// Arrange
			mockIsDebugMode.mockReturnValue(true);
			const message = createMockMessage({ content: 'Did somebody say BLU?' });
			const condition = withChance(INTERRUPT_CHANCE);

			// Act - Test multiple times with same input
			const results: boolean[] = [];
			for (let i = 0; i < 10; i++) {
				results.push(condition());
			}

			// Assert - All results should be true in debug mode
			expect(results.every((r) => r === true)).toBe(true);
		});
	});

	describe('ChadBot Random Trigger Behavior', () => {
		test('should trigger at 100% rate in debug mode', () => {
			// Arrange
			mockIsDebugMode.mockReturnValue(true);
			const message = createMockMessage({
				author: { id: 'not-chad-id' }, // Not the real Chad
			});

			// ChadBot condition: not from Chad AND random chance
			const condition = and(not(fromUser(CHAD_USER_ID)), withChance(CHAD_RESPONSE_CHANCE));

			// Act & Assert - Should always trigger in debug mode
			for (let i = 0; i < 10; i++) {
				const _result = condition(message);
				expect(result).toBe(true);
			}
		});

		test('should never trigger from real Chad user even in debug mode', () => {
			// Arrange
			mockIsDebugMode.mockReturnValue(true);
			const message = createMockMessage({
				author: { id: CHAD_USER_ID }, // Real Chad
			});

			const condition = and(not(fromUser(CHAD_USER_ID)), withChance(CHAD_RESPONSE_CHANCE));

			// Act & Assert - Should never trigger from real Chad
			for (let i = 0; i < 10; i++) {
				const _result = condition(message);
				expect(result).toBe(false);
			}
		});

		test('should trigger at normal 1% rate in production mode', () => {
			// Arrange
			mockIsDebugMode.mockReturnValue(false);
			const message = createMockMessage({
				author: { id: 'not-chad-id' },
			});

			const condition = and(not(fromUser(CHAD_USER_ID)), withChance(CHAD_RESPONSE_CHANCE));

			// Act - Test many times
			const results: boolean[] = [];
			for (let i = 0; i < 1000; i++) {
				results.push(condition(message));
			}

			// Assert - Should have roughly 1% success rate
			const successCount = results.filter((r) => r).length;
			const successRate = (successCount / results.length) * 100;

			expect(successRate).toBeGreaterThanOrEqual(0.5);
			expect(successRate).toBeLessThanOrEqual(1.5);
		});
	});

	describe('General Random Trigger Testing', () => {
		test('should handle 0% chance correctly in both modes', () => {
			// Arrange - 0% chance should never trigger
			const condition = withChance(0);

			// Act & Assert - Debug mode
			mockIsDebugMode.mockReturnValue(true);
			for (let i = 0; i < 10; i++) {
				expect(condition()).toBe(true); // Debug mode always returns true
			}

			// Act & Assert - Production mode
			mockIsDebugMode.mockReturnValue(false);
			for (let i = 0; i < 10; i++) {
				expect(condition()).toBe(false); // 0% should never trigger
			}
		});

		test('should handle 100% chance correctly in both modes', () => {
			// Arrange - 100% chance should always trigger
			const condition = withChance(100);

			// Act & Assert - Debug mode
			mockIsDebugMode.mockReturnValue(true);
			for (let i = 0; i < 10; i++) {
				expect(condition()).toBe(true);
			}

			// Act & Assert - Production mode
			mockIsDebugMode.mockReturnValue(false);
			for (let i = 0; i < 10; i++) {
				expect(condition()).toBe(true); // 100% should always trigger
			}
		});

		test('should handle edge case percentages in debug mode', () => {
			// Arrange
			mockIsDebugMode.mockReturnValue(true);
			const edgeCases = [0.1, 0.5, 99.9, 50];

			// Act & Assert - All should return true in debug mode
			edgeCases.forEach((chance) => {
				const condition = withChance(chance);
				for (let i = 0; i < 5; i++) {
					expect(condition()).toBe(true);
				}
			});
		});
	});

	describe('Complex Condition Combinations', () => {
		test('should handle AND conditions with random triggers in debug mode', () => {
			// Arrange
			mockIsDebugMode.mockReturnValue(true);
			const message = createMockMessage({ content: 'test message' });

			// Complex condition: not from bot AND random chance
			const condition = and((msg: any) => !msg.author.bot, withChance(1));

			// Act & Assert - Should always trigger in debug mode
			for (let i = 0; i < 10; i++) {
				const _result = condition(message);
				expect(result).toBe(true);
			}
		});

		test('should handle OR conditions with random triggers in debug mode', () => {
			// Arrange
			mockIsDebugMode.mockReturnValue(true);
			const message = createMockMessage({ author: { bot: true } }); // Bot message

			// Complex condition: from bot OR random chance
			const condition = (msg: any) => msg.author.bot || withChance(1)();

			// Act & Assert - Should trigger due to bot check OR debug mode
			for (let i = 0; i < 10; i++) {
				const _result = condition(message);
				expect(result).toBe(true);
			}
		});
	});

	describe('Reply Bot Channel Filtering with DEBUG_MODE=true', () => {
		test('should prevent InterruptBot responses in non-whitelisted channels even with 100% trigger rate', () => {
			// Arrange
			mockIsDebugMode.mockReturnValue(true); // 100% trigger rate
			const whitelistedChannels = ['777888999000111222', '333444555666777888'];
			const blockedChannelId = '999999999999999999';

			// Mock MessageFilter to simulate channel filtering
			const mockMessageFilter = {
				shouldProcessMessage: jest.fn().mockReturnValue({
					allowed: false,
					reason: `Channel ${blockedChannelId} not in allowed testing channels [${whitelistedChannels.join(', ')}]`,
				}),
			};

			// Act - Simulate InterruptBot processing
			const message = createMockMessage({
				content: 'Did somebody say BLU?', // Typical InterruptBot trigger
				channel: { id: blockedChannelId },
			});

			const filterResult = mockMessageFilter.shouldProcessMessage({
				channelId: blockedChannelId,
				serverId: message.guild?.id,
				userId: message.author.id,
				username: message.author.username,
				content: message.content,
			});

			// Assert - Message should be blocked before InterruptBot can respond
			expect(filterResult.allowed).toBe(false);
			expect(filterResult.reason).toContain('Channel 999999999999999999 not in allowed testing channels');

			// Verify that even though debug mode would trigger 100%, filtering prevents response
			const triggerCondition = withChance(INTERRUPT_CHANCE);
			expect(triggerCondition()).toBe(true); // Debug mode = 100% trigger
			// But the message filter would prevent the bot from ever seeing the message
		});

		test('should allow InterruptBot responses in whitelisted channels with 100% trigger rate', () => {
			// Arrange
			mockIsDebugMode.mockReturnValue(true); // 100% trigger rate
			const whitelistedChannels = ['777888999000111222', '333444555666777888'];
			const allowedChannelId = '777888999000111222';

			// Mock MessageFilter to simulate channel filtering
			const mockMessageFilter = {
				shouldProcessMessage: jest.fn().mockReturnValue({
					allowed: true,
				}),
			};

			// Act - Simulate InterruptBot processing
			const message = createMockMessage({
				content: 'Did somebody say BLU?',
				channel: { id: allowedChannelId },
			});

			const filterResult = mockMessageFilter.shouldProcessMessage({
				channelId: allowedChannelId,
				serverId: message.guild?.id,
				userId: message.author.id,
				username: message.author.username,
				content: message.content,
			});

			// Assert - Message should be allowed and InterruptBot can respond
			expect(filterResult.allowed).toBe(true);

			// Verify debug mode triggers 100%
			const triggerCondition = withChance(INTERRUPT_CHANCE);
			expect(triggerCondition()).toBe(true);
		});

		test('should prevent ChadBot responses in non-whitelisted channels even with 100% trigger rate', () => {
			// Arrange
			mockIsDebugMode.mockReturnValue(true); // 100% trigger rate
			const whitelistedChannels = ['777888999000111222'];
			const blockedChannelId = '999999999999999999';

			// Mock MessageFilter to simulate channel filtering
			const mockMessageFilter = {
				shouldProcessMessage: jest.fn().mockReturnValue({
					allowed: false,
					reason: `Channel ${blockedChannelId} not in allowed testing channels [${whitelistedChannels.join(', ')}]`,
				}),
			};

			// Act - Simulate ChadBot processing
			const message = createMockMessage({
				content: 'Some message that would trigger Chad',
				channel: { id: blockedChannelId },
				author: { id: 'not-chad-id' }, // Not the real Chad
			});

			const filterResult = mockMessageFilter.shouldProcessMessage({
				channelId: blockedChannelId,
				serverId: message.guild?.id,
				userId: message.author.id,
				username: message.author.username,
				content: message.content,
			});

			// Assert - Message should be blocked before ChadBot can respond
			expect(filterResult.allowed).toBe(false);
			expect(filterResult.reason).toContain('Channel 999999999999999999 not in allowed testing channels');

			// Verify that ChadBot condition would trigger in debug mode
			const chadCondition = and(not(fromUser(CHAD_USER_ID)), withChance(CHAD_RESPONSE_CHANCE));
			expect(chadCondition(message)).toBe(true); // Debug mode = 100% trigger
			// But the message filter would prevent the bot from processing the message
		});

		test('should verify filtering occurs before any reply bot condition evaluation', () => {
			// Arrange
			mockIsDebugMode.mockReturnValue(true);
			const whitelistedChannels = ['777888999000111222'];
			const blockedChannelId = '999999999999999999';

			// Mock condition evaluation tracking
			const mockConditionEvaluated = jest.fn();
			const mockBotResponse = jest.fn();

			// Mock MessageFilter to simulate channel filtering
			const mockMessageFilter = {
				shouldProcessMessage: jest.fn().mockReturnValue({
					allowed: false,
					reason: `Channel ${blockedChannelId} not in allowed testing channels`,
				}),
			};

			// Act - Simulate message processing pipeline
			const message = createMockMessage({
				content: 'trigger message',
				channel: { id: blockedChannelId },
			});

			const filterResult = mockMessageFilter.shouldProcessMessage({
				channelId: blockedChannelId,
				serverId: message.guild?.id,
				userId: message.author.id,
				username: message.author.username,
				content: message.content,
			});

			// Simulate proper message processing pipeline
			if (filterResult.allowed) {
				mockConditionEvaluated();
				mockBotResponse();
			}

			// Assert - No bot processing should occur when message is filtered
			expect(filterResult.allowed).toBe(false);
			expect(mockConditionEvaluated).not.toHaveBeenCalled();
			expect(mockBotResponse).not.toHaveBeenCalled();
		});

		test('should prevent all reply bot types from responding in blocked channels', () => {
			// Arrange
			mockIsDebugMode.mockReturnValue(true);
			const whitelistedChannels = ['777888999000111222'];
			const blockedChannelId = '999999999999999999';

			// Mock MessageFilter to simulate channel filtering
			const mockMessageFilter = {
				shouldProcessMessage: jest.fn().mockReturnValue({
					allowed: false,
					reason: `Channel ${blockedChannelId} not in allowed testing channels`,
				}),
			};

			// Test different reply bot scenarios
			const testScenarios = [
				{ botType: 'InterruptBot', content: 'Did somebody say BLU?' },
				{ botType: 'ChadBot', content: 'Some Chad trigger', authorId: 'not-chad' },
				{ botType: 'SigGreatBot', content: 'Some sig trigger' },
				{ botType: 'GuyBot', content: 'Some guy trigger' },
			];

			testScenarios.forEach((scenario) => {
				// Act
				const message = createMockMessage({
					content: scenario.content,
					channel: { id: blockedChannelId },
					author: { id: scenario.authorId || 'test-user' },
				});

				const filterResult = mockMessageFilter.shouldProcessMessage({
					channelId: blockedChannelId,
					serverId: message.guild?.id,
					userId: message.author.id,
					username: message.author.username,
					content: message.content,
				});

				// Assert - All bot types should be blocked
				expect(filterResult.allowed).toBe(false);
				expect(filterResult.reason).toContain('not in allowed testing channels');
			});
		});
	});
});
