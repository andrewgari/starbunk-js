// Tests for message filtering service
import { MessageFilter, getMessageFilter, resetMessageFilter } from '../messageFilter';
import type { MessageContext } from '../messageFilter';

// Mock the environment validation utilities
jest.mock('../../utils/envValidation', () => ({
	getTestingServerIds: jest.fn(),
	getTestingChannelIds: jest.fn(),
	getDebugMode: jest.fn(),
}));

import { getTestingServerIds, getTestingChannelIds, getDebugMode } from '../../utils/envValidation';

describe('MessageFilter', () => {
	const mockGetTestingServerIds = getTestingServerIds as jest.MockedFunction<typeof getTestingServerIds>;
	const mockGetTestingChannelIds = getTestingChannelIds as jest.MockedFunction<typeof getTestingChannelIds>;
	const mockGetDebugMode = getDebugMode as jest.MockedFunction<typeof getDebugMode>;

	beforeEach(() => {
		// Reset all mocks
		jest.clearAllMocks();
		resetMessageFilter();

		// Default mock implementations
		mockGetTestingServerIds.mockReturnValue([]);
		mockGetTestingChannelIds.mockReturnValue([]);
		mockGetDebugMode.mockReturnValue(false);
	});

	describe('constructor and configuration', () => {
		test('should initialize with empty restrictions by default', () => {
			const filter = new MessageFilter();

			expect(filter.getTestingServerIds()).toEqual([]);
			expect(filter.getTestingChannelIds()).toEqual([]);
			expect(filter.isDebugMode()).toBe(false);
		});

		test('should initialize with configured restrictions', () => {
			mockGetTestingServerIds.mockReturnValue(['123456789012345678']);
			mockGetTestingChannelIds.mockReturnValue(['987654321098765432']);
			mockGetDebugMode.mockReturnValue(true);

			const filter = new MessageFilter();

			expect(filter.getTestingServerIds()).toEqual(['123456789012345678']);
			expect(filter.getTestingChannelIds()).toEqual(['987654321098765432']);
			expect(filter.isDebugMode()).toBe(true);
		});
	});

	describe('shouldProcessMessage', () => {
		test('should allow all messages when no restrictions are set', () => {
			const filter = new MessageFilter();

			const context: MessageContext = {
				serverId: '123456789012345678',
				channelId: '987654321098765432',
				userId: '111222333444555666',
				username: 'testuser',
				content: 'test message',
			};

			const result = filter.shouldProcessMessage(context);
			expect(result.allowed).toBe(true);
			expect(result.reason).toBeUndefined();
		});

		test('should block messages from non-allowed servers', () => {
			mockGetTestingServerIds.mockReturnValue(['allowed-server-id']);

			const filter = new MessageFilter();

			const context: MessageContext = {
				serverId: 'blocked-server-id',
				channelId: '987654321098765432',
				userId: '111222333444555666',
				username: 'testuser',
			};

			const result = filter.shouldProcessMessage(context);
			expect(result.allowed).toBe(false);
			expect(result.reason).toContain('Server blocked-server-id not in allowed testing servers');
		});

		test('should allow messages from allowed servers', () => {
			mockGetTestingServerIds.mockReturnValue(['allowed-server-id']);

			const filter = new MessageFilter();

			const context: MessageContext = {
				serverId: 'allowed-server-id',
				channelId: '987654321098765432',
				userId: '111222333444555666',
				username: 'testuser',
			};

			const result = filter.shouldProcessMessage(context);
			expect(result.allowed).toBe(true);
		});

		test('should block messages from non-allowed channels', () => {
			mockGetTestingChannelIds.mockReturnValue(['allowed-channel-id']);

			const filter = new MessageFilter();

			const context: MessageContext = {
				serverId: '123456789012345678',
				channelId: 'blocked-channel-id',
				userId: '111222333444555666',
				username: 'testuser',
			};

			const result = filter.shouldProcessMessage(context);
			expect(result.allowed).toBe(false);
			expect(result.reason).toContain('Channel blocked-channel-id not in allowed testing channels');
		});

		test('should allow messages from allowed channels', () => {
			mockGetTestingChannelIds.mockReturnValue(['allowed-channel-id']);

			const filter = new MessageFilter();

			const context: MessageContext = {
				serverId: '123456789012345678',
				channelId: 'allowed-channel-id',
				userId: '111222333444555666',
				username: 'testuser',
			};

			const result = filter.shouldProcessMessage(context);
			expect(result.allowed).toBe(true);
		});

		test('should apply guild-level precedence over channel restrictions', () => {
			mockGetTestingServerIds.mockReturnValue(['allowed-server-id']);
			mockGetTestingChannelIds.mockReturnValue(['allowed-channel-id']);

			const filter = new MessageFilter();

			// Should block if server is not allowed and channel is not specifically whitelisted
			let context: MessageContext = {
				serverId: 'blocked-server-id',
				channelId: 'some-other-channel-id',
				userId: '111222333444555666',
				username: 'testuser',
			};

			let result = filter.shouldProcessMessage(context);
			expect(result.allowed).toBe(false);

			// Should allow if server is not whitelisted but channel is specifically whitelisted
			context = {
				serverId: 'blocked-server-id',
				channelId: 'allowed-channel-id',
				userId: '111222333444555666',
				username: 'testuser',
			};

			result = filter.shouldProcessMessage(context);
			expect(result.allowed).toBe(true);

			// Should allow ALL channels if server is whitelisted (guild-level precedence)
			context = {
				serverId: 'allowed-server-id',
				channelId: 'any-channel-id-in-whitelisted-guild',
				userId: '111222333444555666',
				username: 'testuser',
			};

			result = filter.shouldProcessMessage(context);
			expect(result.allowed).toBe(true);

			// Should allow if both server and channel are allowed
			context = {
				serverId: 'allowed-server-id',
				channelId: 'allowed-channel-id',
				userId: '111222333444555666',
				username: 'testuser',
			};

			result = filter.shouldProcessMessage(context);
			expect(result.allowed).toBe(true);
		});

		test('should handle DM messages (no serverId)', () => {
			// Test with only server restrictions - DMs should be allowed
			mockGetTestingServerIds.mockReturnValue(['allowed-server-id']);

			let filter = new MessageFilter();

			let context: MessageContext = {
				serverId: undefined,
				channelId: '987654321098765432',
				userId: '111222333444555666',
				username: 'testuser',
			};

			// DM messages should be allowed when only server restrictions exist
			let result = filter.shouldProcessMessage(context);
			expect(result.allowed).toBe(true);

			// Test with both server and channel restrictions - DMs only allowed if channel is whitelisted
			mockGetTestingServerIds.mockReturnValue(['allowed-server-id']);
			mockGetTestingChannelIds.mockReturnValue(['allowed-channel-id']);

			filter = new MessageFilter();

			// DM with non-whitelisted channel should be blocked
			context = {
				serverId: undefined,
				channelId: 'non-whitelisted-dm-channel',
				userId: '111222333444555666',
				username: 'testuser',
			};

			result = filter.shouldProcessMessage(context);
			expect(result.allowed).toBe(false);

			// DM with whitelisted channel should be allowed
			context = {
				serverId: undefined,
				channelId: 'allowed-channel-id',
				userId: '111222333444555666',
				username: 'testuser',
			};

			result = filter.shouldProcessMessage(context);
			expect(result.allowed).toBe(true);
		});
	});

	describe('static helper methods', () => {
		test('createContextFromMessage should extract correct fields', () => {
			const mockMessage = {
				guild: { id: 'server-123' },
				channel: { id: 'channel-456' },
				author: { id: 'user-789', username: 'testuser' },
				content: 'Hello world',
			};

			const context = MessageFilter.createContextFromMessage(mockMessage);

			expect(context).toEqual({
				serverId: 'server-123',
				channelId: 'channel-456',
				userId: 'user-789',
				username: 'testuser',
				content: 'Hello world',
			});
		});

		test('createContextFromMessage should handle DM messages', () => {
			const mockMessage = {
				guild: null,
				channel: { id: 'dm-channel-456' },
				author: { id: 'user-789', username: 'testuser' },
				content: 'Hello world',
			};

			const context = MessageFilter.createContextFromMessage(mockMessage);

			expect(context).toEqual({
				serverId: undefined,
				channelId: 'dm-channel-456',
				userId: 'user-789',
				username: 'testuser',
				content: 'Hello world',
			});
		});

		test('createContextFromInteraction should extract correct fields', () => {
			const mockInteraction = {
				guild: { id: 'server-123' },
				channel: { id: 'channel-456' },
				user: { id: 'user-789', username: 'testuser' },
				commandName: 'ping',
			};

			const context = MessageFilter.createContextFromInteraction(mockInteraction);

			expect(context).toEqual({
				serverId: 'server-123',
				channelId: 'channel-456',
				userId: 'user-789',
				username: 'testuser',
				content: 'ping',
			});
		});

		test('createContextFromInteraction should handle missing channel', () => {
			const mockInteraction = {
				guild: { id: 'server-123' },
				channel: null,
				channelId: 'channel-456',
				user: { id: 'user-789', username: 'testuser' },
				commandName: 'ping',
			};

			const context = MessageFilter.createContextFromInteraction(mockInteraction);

			expect(context).toEqual({
				serverId: 'server-123',
				channelId: 'channel-456',
				userId: 'user-789',
				username: 'testuser',
				content: 'ping',
			});
		});
	});

	describe('singleton pattern', () => {
		test('getMessageFilter should return the same instance', () => {
			const filter1 = getMessageFilter();
			const filter2 = getMessageFilter();

			expect(filter1).toBe(filter2);
		});

		test('resetMessageFilter should create new instance', () => {
			const filter1 = getMessageFilter();
			resetMessageFilter();
			const filter2 = getMessageFilter();

			expect(filter1).not.toBe(filter2);
		});
	});

	describe('refreshConfiguration', () => {
		test('should update configuration from environment', () => {
			// Start with empty configuration
			const filter = new MessageFilter();
			expect(filter.getTestingServerIds()).toEqual([]);

			// Change mock to return new values
			mockGetTestingServerIds.mockReturnValue(['new-server-id']);
			mockGetDebugMode.mockReturnValue(true);

			// Refresh configuration
			filter.refreshConfiguration();

			// Should have new values
			expect(filter.getTestingServerIds()).toEqual(['new-server-id']);
			expect(filter.isDebugMode()).toBe(true);
		});
	});
});
