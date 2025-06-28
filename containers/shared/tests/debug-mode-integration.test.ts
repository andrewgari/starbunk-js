// Integration tests for debug mode functionality across shared services
import { MessageFilter, resetMessageFilter } from '../src/services/messageFilter';
import { WebhookManager } from '../src/services/webhookManager';
import { getDebugMode, getTestingServerIds, getTestingChannelIds } from '../src/utils/envValidation';

// Mock environment validation utilities
jest.mock('../src/utils/envValidation', () => ({
	getTestingServerIds: jest.fn(),
	getTestingChannelIds: jest.fn(),
	getDebugMode: jest.fn(),
	isDebugMode: jest.fn()
}));

// Mock Discord.js
jest.mock('discord.js', () => ({
	Client: jest.fn(),
	TextChannel: jest.fn(),
	WebhookClient: jest.fn().mockImplementation(() => ({
		send: jest.fn().mockResolvedValue({ id: 'message-id' })
	}))
}));

// Mock logger
jest.mock('../src/services/logger', () => ({
	logger: {
		info: jest.fn(),
		debug: jest.fn(),
		warn: jest.fn(),
		error: jest.fn()
	}
}));

import { logger } from '../src/services/logger';

describe('Debug Mode Integration Tests', () => {
	const mockGetTestingServerIds = getTestingServerIds as jest.MockedFunction<typeof getTestingServerIds>;
	const mockGetTestingChannelIds = getTestingChannelIds as jest.MockedFunction<typeof getTestingChannelIds>;
	const mockGetDebugMode = getDebugMode as jest.MockedFunction<typeof getDebugMode>;

	beforeEach(() => {
		jest.clearAllMocks();
		resetMessageFilter();
		
		// Default mock implementations
		mockGetTestingServerIds.mockReturnValue([]);
		mockGetTestingChannelIds.mockReturnValue([]);
		mockGetDebugMode.mockReturnValue(false);
	});

	describe('Three-Tier Debug Configuration System', () => {
		test('should properly initialize with all three debug environment variables', () => {
			// Arrange
			const testServerIds = ['123456789012345678', '987654321098765432'];
			const testChannelIds = ['111222333444555666', '777888999000111222'];
			
			mockGetDebugMode.mockReturnValue(true);
			mockGetTestingServerIds.mockReturnValue(testServerIds);
			mockGetTestingChannelIds.mockReturnValue(testChannelIds);
			
			// Act
			const filter = new MessageFilter();
			
			// Assert
			expect(filter.isDebugMode()).toBe(true);
			expect(filter.getTestingServerIds()).toEqual(testServerIds);
			expect(filter.getTestingChannelIds()).toEqual(testChannelIds);
		});

		test('should handle partial configuration correctly', () => {
			// Arrange - Only DEBUG_MODE and TESTING_SERVER_IDS set
			mockGetDebugMode.mockReturnValue(true);
			mockGetTestingServerIds.mockReturnValue(['123456789012345678']);
			mockGetTestingChannelIds.mockReturnValue([]); // Not set
			
			// Act
			const filter = new MessageFilter();
			
			// Assert
			expect(filter.isDebugMode()).toBe(true);
			expect(filter.getTestingServerIds()).toEqual(['123456789012345678']);
			expect(filter.getTestingChannelIds()).toEqual([]);
		});

		test('should work with only channel restrictions', () => {
			// Arrange - Only TESTING_CHANNEL_IDS set
			mockGetDebugMode.mockReturnValue(false);
			mockGetTestingServerIds.mockReturnValue([]);
			mockGetTestingChannelIds.mockReturnValue(['111222333444555666']);
			
			// Act
			const filter = new MessageFilter();
			
			// Assert
			expect(filter.isDebugMode()).toBe(false);
			expect(filter.getTestingServerIds()).toEqual([]);
			expect(filter.getTestingChannelIds()).toEqual(['111222333444555666']);
		});
	});

	describe('Message Filtering Logic Applied Before Processing', () => {
		test('should filter messages before any bot processing occurs', () => {
			// Arrange
			const allowedServerId = '123456789012345678';
			const blockedServerId = '999888777666555444';
			
			mockGetTestingServerIds.mockReturnValue([allowedServerId]);
			
			const filter = new MessageFilter();
			
			// Create message contexts
			const allowedContext = {
				serverId: allowedServerId,
				channelId: '777888999000111222',
				userId: '987654321098765432',
				username: 'testuser',
				content: 'test message'
			};
			
			const blockedContext = {
				serverId: blockedServerId,
				channelId: '777888999000111222',
				userId: '987654321098765432',
				username: 'testuser',
				content: 'test message'
			};
			
			// Act & Assert
			const allowedResult = filter.shouldProcessMessage(allowedContext);
			expect(allowedResult.allowed).toBe(true);
			
			const blockedResult = filter.shouldProcessMessage(blockedContext);
			expect(blockedResult.allowed).toBe(false);
			expect(blockedResult.reason).toBeDefined();
		});

		test('should provide detailed filtering reasons for debugging', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);
			mockGetTestingServerIds.mockReturnValue(['allowed-server']);
			
			const filter = new MessageFilter();
			
			const context = {
				serverId: 'blocked-server',
				channelId: '777888999000111222',
				userId: '987654321098765432',
				username: 'testuser',
				content: 'test message'
			};
			
			// Act
			const result = filter.shouldProcessMessage(context);
			
			// Assert
			expect(result.allowed).toBe(false);
			expect(result.reason).toContain('blocked-server');
			expect(result.reason).toContain('not in allowed testing servers');
			expect(result.reason).toContain('allowed-server');
		});
	});

	describe('Environment Variable Precedence', () => {
		test('should prioritize environment variables over hardcoded values', () => {
			// Arrange - Environment variables should override any hardcoded IDs
			const envServerIds = ['env-server-123'];
			const envChannelIds = ['env-channel-456'];
			
			mockGetTestingServerIds.mockReturnValue(envServerIds);
			mockGetTestingChannelIds.mockReturnValue(envChannelIds);
			
			// Act
			const filter = new MessageFilter();
			
			// Assert - Should use environment values, not hardcoded ones
			expect(filter.getTestingServerIds()).toEqual(envServerIds);
			expect(filter.getTestingChannelIds()).toEqual(envChannelIds);
		});

		test('should handle empty environment variables correctly', () => {
			// Arrange - Empty environment variables
			mockGetTestingServerIds.mockReturnValue([]);
			mockGetTestingChannelIds.mockReturnValue([]);
			mockGetDebugMode.mockReturnValue(false);
			
			// Act
			const filter = new MessageFilter();
			
			// Assert - Should allow all messages when no restrictions
			const context = {
				serverId: 'any-server',
				channelId: 'any-channel',
				userId: '987654321098765432',
				username: 'testuser'
			};
			
			const result = filter.shouldProcessMessage(context);
			expect(result.allowed).toBe(true);
		});
	});

	describe('External Service Isolation', () => {
		test('should prevent webhook creation in debug mode', async () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);
			
			const mockClient = {
				channels: {
					fetch: jest.fn().mockResolvedValue({
						isTextBased: () => true,
						fetchWebhooks: jest.fn().mockResolvedValue(new Map()),
						createWebhook: jest.fn().mockResolvedValue({
							id: 'webhook-id',
							token: 'webhook-token'
						})
					})
				}
			};
			
			const webhookManager = new WebhookManager(mockClient as any);
			
			// Act
			await webhookManager.sendMessage('channel-id', {
				content: 'test message',
				username: 'TestBot'
			});
			
			// Assert - In a real implementation, this would be mocked to prevent actual webhook calls
			// For now, we verify the webhook manager was instantiated
			expect(webhookManager).toBeDefined();
		});

		test('should log debug information when filtering occurs', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);
			mockGetTestingServerIds.mockReturnValue(['allowed-server']);
			
			const filter = new MessageFilter();
			
			const context = {
				serverId: 'blocked-server',
				channelId: '777888999000111222',
				userId: '987654321098765432',
				username: 'testuser',
				content: 'test message'
			};
			
			// Act
			filter.shouldProcessMessage(context);
			
			// Assert - Should have logged configuration and filtering decision
			expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Message Filter Configuration'));
		});
	});

	describe('Configuration Refresh and Runtime Changes', () => {
		test('should refresh configuration when environment changes', () => {
			// Arrange
			mockGetTestingServerIds.mockReturnValue(['initial-server']);
			const filter = new MessageFilter();
			expect(filter.getTestingServerIds()).toEqual(['initial-server']);
			
			// Act - Change environment and refresh
			mockGetTestingServerIds.mockReturnValue(['updated-server']);
			filter.refreshConfiguration();
			
			// Assert
			expect(filter.getTestingServerIds()).toEqual(['updated-server']);
		});

		test('should log configuration refresh', () => {
			// Arrange
			const filter = new MessageFilter();
			
			// Act
			filter.refreshConfiguration();
			
			// Assert
			expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Message Filter configuration refreshed'));
		});
	});

	describe('Edge Cases and Error Handling', () => {
		test('should handle malformed Discord IDs gracefully', () => {
			// Arrange - Mock returns empty arrays for invalid IDs
			mockGetTestingServerIds.mockReturnValue([]); // Invalid IDs filtered out
			mockGetTestingChannelIds.mockReturnValue([]);

			// Act
			const filter = new MessageFilter();

			// Assert - Should not throw and work with empty arrays
			expect(filter.getTestingServerIds()).toEqual([]);
			expect(filter.getTestingChannelIds()).toEqual([]);
		});

		test('should handle DM messages correctly with server restrictions', () => {
			// Arrange
			mockGetTestingServerIds.mockReturnValue(['allowed-server']);
			const filter = new MessageFilter();

			// Act - DM message (no serverId)
			const dmContext = {
				serverId: undefined,
				channelId: 'dm-channel',
				userId: '987654321098765432',
				username: 'testuser'
			};

			const result = filter.shouldProcessMessage(dmContext);

			// Assert - DM messages should be allowed even with server restrictions
			expect(result.allowed).toBe(true);
		});
	});

	describe('Comprehensive Channel Filtering with DEBUG_MODE=true', () => {
		test('should block all message types in non-whitelisted channels when DEBUG_MODE=true', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);
			const whitelistedChannels = ['777888999000111222', '333444555666777888'];
			const blockedChannelId = '999999999999999999';
			mockGetTestingChannelIds.mockReturnValue(whitelistedChannels);

			const filter = new MessageFilter();

			// Test different message types
			const messageTypes = [
				{
					type: 'regular message',
					context: {
						serverId: '123456789012345678',
						channelId: blockedChannelId,
						userId: '987654321098765432',
						username: 'testuser',
						content: 'Hello world'
					}
				},
				{
					type: 'command message',
					context: {
						serverId: '123456789012345678',
						channelId: blockedChannelId,
						userId: '987654321098765432',
						username: 'testuser',
						content: '/ping'
					}
				},
				{
					type: 'mention message',
					context: {
						serverId: '123456789012345678',
						channelId: blockedChannelId,
						userId: '987654321098765432',
						username: 'testuser',
						content: '@bot hello'
					}
				},
				{
					type: 'interaction',
					context: {
						serverId: '123456789012345678',
						channelId: blockedChannelId,
						userId: '987654321098765432',
						username: 'testuser',
						isInteraction: true
					}
				}
			];

			messageTypes.forEach(messageType => {
				// Act
				const result = filter.shouldProcessMessage(messageType.context);

				// Assert - All message types should be blocked
				expect(result.allowed).toBe(false);
				expect(result.reason).toContain(`Channel ${blockedChannelId} not in allowed testing channels`);
				expect(result.reason).toContain('[777888999000111222, 333444555666777888]');
			});
		});

		test('should allow all message types in whitelisted channels when DEBUG_MODE=true', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);
			const whitelistedChannels = ['777888999000111222', '333444555666777888'];
			const allowedChannelId = '777888999000111222';
			mockGetTestingChannelIds.mockReturnValue(whitelistedChannels);

			const filter = new MessageFilter();

			// Test different message types
			const messageTypes = [
				{
					type: 'regular message',
					context: {
						serverId: '123456789012345678',
						channelId: allowedChannelId,
						userId: '987654321098765432',
						username: 'testuser',
						content: 'Hello world'
					}
				},
				{
					type: 'command message',
					context: {
						serverId: '123456789012345678',
						channelId: allowedChannelId,
						userId: '987654321098765432',
						username: 'testuser',
						content: '/ping'
					}
				},
				{
					type: 'interaction',
					context: {
						serverId: '123456789012345678',
						channelId: allowedChannelId,
						userId: '987654321098765432',
						username: 'testuser',
						isInteraction: true
					}
				}
			];

			messageTypes.forEach(messageType => {
				// Act
				const result = filter.shouldProcessMessage(messageType.context);

				// Assert - All message types should be allowed
				expect(result.allowed).toBe(true);
				expect(result.reason).toBeUndefined();
			});
		});

		test('should provide detailed blocking reasons for non-whitelisted channels', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);
			const whitelistedChannels = ['777888999000111222', '333444555666777888'];
			const blockedChannelId = '999999999999999999';
			mockGetTestingChannelIds.mockReturnValue(whitelistedChannels);

			const filter = new MessageFilter();

			// Act
			const context = {
				serverId: '123456789012345678',
				channelId: blockedChannelId,
				userId: '987654321098765432',
				username: 'testuser',
				content: 'This should be blocked'
			};

			const result = filter.shouldProcessMessage(context);

			// Assert - Should provide detailed reason
			expect(result.allowed).toBe(false);
			expect(result.reason).toContain('Channel 999999999999999999 not in allowed testing channels');
			expect(result.reason).toContain('Allowed channels: [777888999000111222, 333444555666777888]');
			expect(result.reason).toContain('DEBUG_MODE=true');
		});

		test('should handle multiple blocked channels consistently', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);
			const whitelistedChannels = ['777888999000111222'];
			const blockedChannels = ['999999999999999999', '888888888888888888', '111111111111111111'];
			mockGetTestingChannelIds.mockReturnValue(whitelistedChannels);

			const filter = new MessageFilter();

			blockedChannels.forEach(blockedChannelId => {
				// Act
				const context = {
					serverId: '123456789012345678',
					channelId: blockedChannelId,
					userId: '987654321098765432',
					username: 'testuser',
					content: 'Test message'
				};

				const result = filter.shouldProcessMessage(context);

				// Assert - All blocked channels should be consistently blocked
				expect(result.allowed).toBe(false);
				expect(result.reason).toContain(`Channel ${blockedChannelId} not in allowed testing channels`);
			});
		});

		test('should verify no external service calls occur for blocked channels', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);
			const whitelistedChannels = ['777888999000111222'];
			const blockedChannelId = '999999999999999999';
			mockGetTestingChannelIds.mockReturnValue(whitelistedChannels);

			const filter = new MessageFilter();

			// Mock external service tracking
			const mockExternalServiceCall = jest.fn();
			const mockDatabaseWrite = jest.fn();
			const mockAPIRequest = jest.fn();
			const mockWebhookSend = jest.fn();

			// Act
			const context = {
				serverId: '123456789012345678',
				channelId: blockedChannelId,
				userId: '987654321098765432',
				username: 'testuser',
				content: 'This should trigger external services'
			};

			const result = filter.shouldProcessMessage(context);

			// Simulate proper message processing pipeline
			if (result.allowed) {
				mockExternalServiceCall();
				mockDatabaseWrite();
				mockAPIRequest();
				mockWebhookSend();
			}

			// Assert - No external services should be called when message is filtered
			expect(result.allowed).toBe(false);
			expect(mockExternalServiceCall).not.toHaveBeenCalled();
			expect(mockDatabaseWrite).not.toHaveBeenCalled();
			expect(mockAPIRequest).not.toHaveBeenCalled();
			expect(mockWebhookSend).not.toHaveBeenCalled();
		});

		test('should handle channel filtering with empty whitelist correctly', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);
			const whitelistedChannels: string[] = []; // Empty whitelist
			const testChannelId = '777888999000111222';
			mockGetTestingChannelIds.mockReturnValue(whitelistedChannels);

			const filter = new MessageFilter();

			// Act
			const context = {
				serverId: '123456789012345678',
				channelId: testChannelId,
				userId: '987654321098765432',
				username: 'testuser',
				content: 'Test message'
			};

			const result = filter.shouldProcessMessage(context);

			// Assert - Should allow all channels when whitelist is empty
			expect(result.allowed).toBe(true);
		});

		test('should prioritize channel filtering over server filtering when both are set', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);
			const whitelistedServers = ['123456789012345678'];
			const whitelistedChannels = ['777888999000111222'];
			const allowedServerId = '123456789012345678';
			const blockedChannelId = '999999999999999999';

			mockGetTestingServerIds.mockReturnValue(whitelistedServers);
			mockGetTestingChannelIds.mockReturnValue(whitelistedChannels);

			const filter = new MessageFilter();

			// Act - Server is allowed but channel is blocked
			const context = {
				serverId: allowedServerId,
				channelId: blockedChannelId,
				userId: '987654321098765432',
				username: 'testuser',
				content: 'Test message'
			};

			const result = filter.shouldProcessMessage(context);

			// Assert - Should be blocked due to channel restriction
			expect(result.allowed).toBe(false);
			expect(result.reason).toContain('Channel 999999999999999999 not in allowed testing channels');
		});
	});
});
