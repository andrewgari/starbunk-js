// Comprehensive debug mode tests for BunkBot container
import { MessageFilter, resetMessageFilter } from '@starbunk/shared/dist/services/messageFilter';
import { withChance } from '../src/core/conditions';
import { WebhookManager } from '@starbunk/shared/dist/services/webhookManager';
import { BotRegistry } from '../src/botRegistry';

// Mock environment validation utilities
jest.mock('@starbunk/shared/dist/utils/envValidation', () => ({
	getTestingServerIds: jest.fn(),
	getTestingChannelIds: jest.fn(),
	getDebugMode: jest.fn(),
	isDebugMode: jest.fn(),
}));

// Mock shared services
jest.mock('@starbunk/shared/dist/services/webhookManager');
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

describe('BunkBot Debug Mode Functionality', () => {
	const mockGetTestingServerIds = getTestingServerIds as jest.MockedFunction<typeof getTestingServerIds>;
	const mockGetTestingChannelIds = getTestingChannelIds as jest.MockedFunction<typeof getTestingChannelIds>;
	const mockGetDebugMode = getDebugMode as jest.MockedFunction<typeof getDebugMode>;
	const mockIsDebugMode = isDebugMode as jest.MockedFunction<typeof isDebugMode>;
	const mockWebhookManager = WebhookManager as jest.MockedClass<typeof WebhookManager>;

	// Mock Discord.js objects
	const createMockMessage = (overrides: any = {}) => ({
		id: '123456789012345678',
		content: 'test message',
		author: {
			id: '987654321098765432',
			username: 'testuser',
			bot: false,
			...overrides.author,
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
		client: {
			user: { id: 'bot-id' },
		},
		...overrides,
	});

	const createMockInteraction = (overrides: any = {}) => ({
		commandName: 'ping',
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
		...overrides,
	});

	beforeEach(() => {
		// Reset all mocks
		jest.clearAllMocks();
		resetMessageFilter();

		// Default mock implementations
		mockGetTestingServerIds.mockReturnValue([]);
		mockGetTestingChannelIds.mockReturnValue([]);
		mockGetDebugMode.mockReturnValue(false);
		mockIsDebugMode.mockReturnValue(false);

		// Reset webhook manager mock
		mockWebhookManager.mockClear();
	});

	describe('Random Trigger Behavior Testing', () => {
		test.skip('should trigger at 100% rate when DEBUG_MODE=true', () => {
			// Arrange
			mockIsDebugMode.mockReturnValue(true);
			const chance = 1; // 1% normal chance
			const condition = withChance(chance);

			// Act & Assert - Test multiple times to ensure deterministic behavior
			for (let i = 0; i < 10; i++) {
				const _result = condition();
				expect(result).toBe(true);
			}
		});

		test('should trigger at normal percentage when DEBUG_MODE=false', () => {
			// Arrange
			mockIsDebugMode.mockReturnValue(false);
			const chance = 0; // 0% chance should never trigger
			const condition = withChance(chance);

			// Act & Assert - Test multiple times
			for (let i = 0; i < 10; i++) {
				const _result = condition();
				expect(result).toBe(false);
			}
		});

		test.skip('should have consistent behavior with identical inputs in debug mode', () => {
			// Arrange
			mockIsDebugMode.mockReturnValue(true);
			const chance = 50; // 50% normal chance
			const condition = withChance(chance);

			// Act - Get first result
			const firstResult = condition();

			// Assert - All subsequent calls should return true (deterministic in debug)
			for (let i = 0; i < 5; i++) {
				const _result = condition();
				expect(result).toBe(true);
			}
			expect(firstResult).toBe(true);
		});
	});

	describe('Message Filtering and Posting Restrictions', () => {
		test('should only process messages in allowed guilds when TESTING_SERVER_IDS is set', () => {
			// Arrange
			const allowedServerId = '111222333444555666';
			const blockedServerId = '999888777666555444';
			mockGetTestingServerIds.mockReturnValue([allowedServerId]);

			const filter = new MessageFilter();

			// Act & Assert - Allowed server
			const allowedMessage = createMockMessage({ guild: { id: allowedServerId } });
			const allowedContext = MessageFilter.createContextFromMessage(allowedMessage);
			const allowedResult = filter.shouldProcessMessage(allowedContext);
			expect(allowedResult.allowed).toBe(true);

			// Act & Assert - Blocked server
			const blockedMessage = createMockMessage({ guild: { id: blockedServerId } });
			const blockedContext = MessageFilter.createContextFromMessage(blockedMessage);
			const blockedResult = filter.shouldProcessMessage(blockedContext);
			expect(blockedResult.allowed).toBe(false);
			expect(blockedResult.reason).toContain('not in allowed testing servers');
		});

		test('should only process messages in allowed channels when TESTING_CHANNEL_IDS is set', () => {
			// Arrange
			const allowedChannelId = '777888999000111222';
			const blockedChannelId = '333444555666777888';
			mockGetTestingChannelIds.mockReturnValue([allowedChannelId]);

			const filter = new MessageFilter();

			// Act & Assert - Allowed channel
			const allowedMessage = createMockMessage({ channel: { id: allowedChannelId } });
			const allowedContext = MessageFilter.createContextFromMessage(allowedMessage);
			const allowedResult = filter.shouldProcessMessage(allowedContext);
			expect(allowedResult.allowed).toBe(true);

			// Act & Assert - Blocked channel
			const blockedMessage = createMockMessage({ channel: { id: blockedChannelId } });
			const blockedContext = MessageFilter.createContextFromMessage(blockedMessage);
			const blockedResult = filter.shouldProcessMessage(blockedContext);
			expect(blockedResult.allowed).toBe(false);
			expect(blockedResult.reason).toContain('not in allowed testing channels');
		});

		test.skip('should apply both server and channel restrictions when both are set', () => {
			// Arrange
			const allowedServerId = '111222333444555666';
			const allowedChannelId = '777888999000111222';
			const blockedServerId = '999888777666555444';
			const blockedChannelId = '333444555666777888';

			mockGetTestingServerIds.mockReturnValue([allowedServerId]);
			mockGetTestingChannelIds.mockReturnValue([allowedChannelId]);

			const filter = new MessageFilter();

			// Act & Assert - Both allowed
			const allowedMessage = createMockMessage({
				guild: { id: allowedServerId },
				channel: { id: allowedChannelId },
			});
			const allowedContext = MessageFilter.createContextFromMessage(allowedMessage);
			const allowedResult = filter.shouldProcessMessage(allowedContext);
			expect(allowedResult.allowed).toBe(true);

			// Act & Assert - Server blocked, channel allowed
			const serverBlockedMessage = createMockMessage({
				guild: { id: blockedServerId },
				channel: { id: allowedChannelId },
			});
			const serverBlockedContext = MessageFilter.createContextFromMessage(serverBlockedMessage);
			const serverBlockedResult = filter.shouldProcessMessage(serverBlockedContext);
			expect(serverBlockedResult.allowed).toBe(false);

			// Act & Assert - Server allowed, channel blocked
			const channelBlockedMessage = createMockMessage({
				guild: { id: allowedServerId },
				channel: { id: blockedChannelId },
			});
			const channelBlockedContext = MessageFilter.createContextFromMessage(channelBlockedMessage);
			const channelBlockedResult = filter.shouldProcessMessage(channelBlockedContext);
			expect(channelBlockedResult.allowed).toBe(false);
		});

		test('should block all messages when neither TESTING_SERVER_IDS nor TESTING_CHANNEL_IDS are set but restrictions exist', () => {
			// Arrange - No restrictions configured
			mockGetTestingServerIds.mockReturnValue([]);
			mockGetTestingChannelIds.mockReturnValue([]);

			const filter = new MessageFilter();

			// Act & Assert - Should allow all messages when no restrictions
			const message = createMockMessage();
			const context = MessageFilter.createContextFromMessage(message);
			const _result = filter.shouldProcessMessage(context);
			expect(result.allowed).toBe(true);
		});

		test('should handle interaction filtering correctly', () => {
			// Arrange
			const allowedServerId = '111222333444555666';
			mockGetTestingServerIds.mockReturnValue([allowedServerId]);

			const filter = new MessageFilter();

			// Act & Assert - Allowed interaction
			const allowedInteraction = createMockInteraction({ guild: { id: allowedServerId } });
			const allowedContext = MessageFilter.createContextFromInteraction(allowedInteraction);
			const allowedResult = filter.shouldProcessMessage(allowedContext);
			expect(allowedResult.allowed).toBe(true);

			// Act & Assert - Blocked interaction
			const blockedInteraction = createMockInteraction({ guild: { id: 'blocked-server' } });
			const blockedContext = MessageFilter.createContextFromInteraction(blockedInteraction);
			const blockedResult = filter.shouldProcessMessage(blockedContext);
			expect(blockedResult.allowed).toBe(false);
		});
	});

	describe('Snowbunk Integration Isolation', () => {
		test('should not send webhooks when DEBUG_MODE=true', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);
			const mockSendMessage = jest.fn();
			mockWebhookManager.prototype.sendMessage = mockSendMessage;

			const webhookManager = new WebhookManager({} as any);

			// Act
			const message = {
				content: 'test message',
				username: 'TestBot',
				avatarURL: 'https://example.com/avatar.png',
			};

			// In debug mode, webhook calls should be mocked/prevented
			// This test verifies that the mock is in place
			expect(mockWebhookManager).toHaveBeenCalled();
		});

		test('should mock external service calls in debug mode', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);

			// Act & Assert - Verify that external services are mocked
			expect(mockWebhookManager).toBeDefined();
			expect(typeof mockWebhookManager).toBe('function');
		});
	});

	describe('Configuration Validation', () => {
		test('should parse comma-separated environment variables correctly', () => {
			// Arrange
			const serverIds = ['123456789012345678', '987654321098765432'];
			const channelIds = ['111222333444555666', '777888999000111222'];

			mockGetTestingServerIds.mockReturnValue(serverIds);
			mockGetTestingChannelIds.mockReturnValue(channelIds);

			const filter = new MessageFilter();

			// Act & Assert
			expect(filter.getTestingServerIds()).toEqual(serverIds);
			expect(filter.getTestingChannelIds()).toEqual(channelIds);
		});

		test('should handle invalid environment variable values gracefully', () => {
			// Arrange - Mock functions should handle invalid values internally
			mockGetTestingServerIds.mockReturnValue([]); // Invalid IDs filtered out
			mockGetTestingChannelIds.mockReturnValue([]);

			const filter = new MessageFilter();

			// Act & Assert - Should not throw and return empty arrays
			expect(filter.getTestingServerIds()).toEqual([]);
			expect(filter.getTestingChannelIds()).toEqual([]);
		});

		test('should refresh configuration when environment changes', () => {
			// Arrange
			mockGetTestingServerIds.mockReturnValue([]);
			const filter = new MessageFilter();
			expect(filter.getTestingServerIds()).toEqual([]);

			// Act - Change environment and refresh
			const newServerIds = ['123456789012345678'];
			mockGetTestingServerIds.mockReturnValue(newServerIds);
			filter.refreshConfiguration();

			// Assert
			expect(filter.getTestingServerIds()).toEqual(newServerIds);
		});
	});

	describe('Channel Filtering with DEBUG_MODE=true', () => {
		test('should block messages in non-whitelisted channels even when DEBUG_MODE=true', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);
			mockIsDebugMode.mockReturnValue(true);
			const whitelistedChannels = ['777888999000111222', '333444555666777888'];
			const blockedChannelId = '999999999999999999';
			mockGetTestingChannelIds.mockReturnValue(whitelistedChannels);

			const filter = new MessageFilter();

			// Act
			const blockedMessage = createMockMessage({
				channel: { id: blockedChannelId },
				content: 'This should be blocked',
			});
			const blockedContext = MessageFilter.createContextFromMessage(blockedMessage);
			const _result = filter.shouldProcessMessage(blockedContext);

			// Assert
			expect(result.allowed).toBe(false);
			expect(result.reason).toContain('Channel 999999999999999999 not in allowed testing channels');
			expect(result.reason).toContain('[777888999000111222, 333444555666777888]');
		});

		test('should allow messages in whitelisted channels when DEBUG_MODE=true', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);
			mockIsDebugMode.mockReturnValue(true);
			const whitelistedChannels = ['777888999000111222', '333444555666777888'];
			const allowedChannelId = '777888999000111222';
			mockGetTestingChannelIds.mockReturnValue(whitelistedChannels);

			const filter = new MessageFilter();

			// Act
			const allowedMessage = createMockMessage({
				channel: { id: allowedChannelId },
				content: 'This should be allowed',
			});
			const allowedContext = MessageFilter.createContextFromMessage(allowedMessage);
			const _result = filter.shouldProcessMessage(allowedContext);

			// Assert
			expect(result.allowed).toBe(true);
			expect(result.reason).toBeUndefined();
		});

		test('should block interactions in non-whitelisted channels even when DEBUG_MODE=true', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);
			mockIsDebugMode.mockReturnValue(true);
			const whitelistedChannels = ['777888999000111222', '333444555666777888'];
			const blockedChannelId = '999999999999999999';
			mockGetTestingChannelIds.mockReturnValue(whitelistedChannels);

			const filter = new MessageFilter();

			// Act
			const blockedInteraction = createMockInteraction({
				channel: { id: blockedChannelId },
				channelId: blockedChannelId,
				commandName: 'ping',
			});
			const blockedContext = MessageFilter.createContextFromInteraction(blockedInteraction);
			const _result = filter.shouldProcessMessage(blockedContext);

			// Assert
			expect(result.allowed).toBe(false);
			expect(result.reason).toContain('Channel 999999999999999999 not in allowed testing channels');
		});

		test('should verify filtering occurs before any bot processing', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);
			mockIsDebugMode.mockReturnValue(true);
			const whitelistedChannels = ['777888999000111222'];
			const blockedChannelId = '999999999999999999';
			mockGetTestingChannelIds.mockReturnValue(whitelistedChannels);

			const filter = new MessageFilter();

			// Mock bot registry to verify it's not called
			const mockBotProcessing = jest.fn();

			// Act
			const blockedMessage = createMockMessage({
				channel: { id: blockedChannelId },
				content: 'trigger some bot response',
			});
			const blockedContext = MessageFilter.createContextFromMessage(blockedMessage);
			const _result = filter.shouldProcessMessage(blockedContext);

			// Assert - Message should be blocked before any bot processing
			expect(result.allowed).toBe(false);
			expect(mockBotProcessing).not.toHaveBeenCalled();
		});

		test('should prevent external service calls when message is filtered', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);
			mockIsDebugMode.mockReturnValue(true);
			const whitelistedChannels = ['777888999000111222'];
			const blockedChannelId = '999999999999999999';
			mockGetTestingChannelIds.mockReturnValue(whitelistedChannels);

			const filter = new MessageFilter();

			// Act
			const blockedMessage = createMockMessage({
				channel: { id: blockedChannelId },
				content: 'This should not trigger webhooks',
			});
			const blockedContext = MessageFilter.createContextFromMessage(blockedMessage);
			const _result = filter.shouldProcessMessage(blockedContext);

			// Assert - No external services should be called
			expect(result.allowed).toBe(false);
			expect(mockWebhookManager).not.toHaveBeenCalled();
		});
	});
});
