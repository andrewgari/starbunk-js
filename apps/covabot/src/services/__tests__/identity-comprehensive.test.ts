import {
	getCovaIdentityFromService,
	getCovaIdentity,
	clearIdentityCache,
	getIdentityCacheStats,
	preWarmIdentityCache,
} from '../identity';
import { container, ServiceId } from '@starbunk/shared';
import { BotIdentity } from '../../types/botIdentity';
import { MockDiscordMessage, createMockGuildMember, createMockUser } from '../../__tests__/mocks/discord-mocks';

// Mock dependencies
jest.mock('@starbunk/shared', () => ({
	logger: {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
	},
	container: {
		get: jest.fn(),
	},
	ServiceId: {
		DiscordService: 'DiscordService',
	},
}));

const mockContainer = container as jest.Mocked<typeof container>;

describe('Identity Service - Comprehensive Tests', () => {
	let mockDiscordService: any;
	const COVA_USER_ID = '139592376443338752';

	beforeEach(() => {
		jest.clearAllMocks();
		clearIdentityCache();

		// Mock Discord service
		mockDiscordService = {
			getMemberAsync: jest.fn(),
			getUserAsync: jest.fn(),
		};

		mockContainer.get.mockReturnValue(mockDiscordService);

		// Set environment variable
		process.env.COVA_USER_ID = COVA_USER_ID;
	});

	afterEach(() => {
		clearIdentityCache();
	});

	describe('Server-Specific Identity Resolution', () => {
		it('should resolve server-specific identity with nickname', async () => {
			const guildId = 'test-guild-123';
			const nickname = 'ServerCova';
			const message = new MockDiscordMessage('test', 'user-123', false, guildId);

			const mockMember = createMockGuildMember(COVA_USER_ID, nickname, guildId);
			mockDiscordService.getMemberAsync.mockResolvedValue(mockMember);

			const identity = await getCovaIdentityFromService(message as any);

			expect(identity).toEqual({
				botName: nickname,
				avatarUrl: expect.stringContaining('guild-avatar.png'),
			});

			expect(mockDiscordService.getMemberAsync).toHaveBeenCalledWith(guildId, COVA_USER_ID);
		});

		it('should fall back to global name when no nickname', async () => {
			const guildId = 'test-guild-123';
			const globalName = 'Cova Global';
			const message = new MockDiscordMessage('test', 'user-123', false, guildId);

			const mockMember = createMockGuildMember(COVA_USER_ID, undefined, guildId);
			mockMember.user!.globalName = globalName;
			mockDiscordService.getMemberAsync.mockResolvedValue(mockMember);

			const identity = await getCovaIdentityFromService(message as any);

			expect(identity).toEqual({
				botName: globalName,
				avatarUrl: expect.any(String),
			});
		});

		it('should fall back to username when no nickname or global name', async () => {
			const guildId = 'test-guild-123';
			const username = 'cova_user';
			const message = new MockDiscordMessage('test', 'user-123', false, guildId);

			const mockMember = createMockGuildMember(COVA_USER_ID, undefined, guildId);
			mockMember.user.globalName = null;
			mockMember.user.username = username;
			mockDiscordService.getMemberAsync.mockResolvedValue(mockMember);

			const identity = await getCovaIdentityFromService(message as any);

			expect(identity).toEqual({
				botName: username,
				avatarUrl: expect.any(String),
			});
		});

		it('should use default name when all name fields are missing', async () => {
			const guildId = 'test-guild-123';
			const message = new MockDiscordMessage('test', 'user-123', false, guildId);

			const mockMember = createMockGuildMember(COVA_USER_ID, undefined, guildId);
			mockMember.user.globalName = null;
			mockMember.user.username = '';
			mockDiscordService.getMemberAsync.mockResolvedValue(mockMember);

			const identity = await getCovaIdentityFromService(message as any);

			expect(identity).toEqual({
				botName: 'CovaBot',
				avatarUrl: expect.any(String),
			});
		});
	});

	describe('Global Identity Resolution', () => {
		it('should resolve global identity when no guild context', async () => {
			const globalName = 'Global Cova';
			const message = new MockDiscordMessage('test', 'user-123', false); // No guild

			const mockUser = createMockUser(COVA_USER_ID, 'cova_user');
			mockUser.globalName = globalName;
			mockDiscordService.getUserAsync.mockResolvedValue(mockUser);

			const identity = await getCovaIdentityFromService(message as any);

			expect(identity).toEqual({
				botName: globalName,
				avatarUrl: expect.any(String),
			});

			expect(mockDiscordService.getUserAsync).toHaveBeenCalledWith(COVA_USER_ID);
			expect(mockDiscordService.getMemberAsync).not.toHaveBeenCalled();
		});

		it.skip('should fall back to global identity when member not found in guild', async () => {
			const guildId = 'test-guild-123';
			const message = new MockDiscordMessage('test', 'user-123', false, guildId);

			mockDiscordService.getMemberAsync.mockResolvedValue(null);

			const mockUser = createMockUser(COVA_USER_ID, 'cova_user');
			mockDiscordService.getUserAsync.mockResolvedValue(mockUser);

			const identity = await getCovaIdentityFromService(message as any);

			expect(identity).toEqual({
				botName: mockUser.username,
				avatarUrl: expect.any(String),
			});
		});
	});

	describe('Identity Validation', () => {
		it.skip('should reject identity with invalid bot name', async () => {
			const message = new MockDiscordMessage('test', 'user-123', false);

			const mockUser = createMockUser(COVA_USER_ID, ''); // Empty username
			mockUser.globalName = '';
			mockDiscordService.getUserAsync.mockResolvedValue(mockUser);

			const identity = await getCovaIdentityFromService(message as any);

			expect(identity).toBeNull();
		});

		it.skip('should reject identity with invalid avatar URL', async () => {
			const message = new MockDiscordMessage('test', 'user-123', false);

			const mockUser = createMockUser(COVA_USER_ID, 'cova_user');
			(mockUser.displayAvatarURL as jest.Mock).mockReturnValue('invalid-url');
			mockDiscordService.getUserAsync.mockResolvedValue(mockUser);

			const identity = await getCovaIdentityFromService(message as any);

			expect(identity).toBeNull();
		});

		it('should reject identity with empty avatar URL', async () => {
			const message = new MockDiscordMessage('test', 'user-123', false);

			const mockUser = createMockUser(COVA_USER_ID, 'cova_user');
			(mockUser.displayAvatarURL as jest.Mock).mockReturnValue('');
			mockDiscordService.getUserAsync.mockResolvedValue(mockUser);

			const identity = await getCovaIdentityFromService(message as any);

			expect(identity).toBeNull();
		});

		it('should accept valid Discord CDN URLs', async () => {
			const message = new MockDiscordMessage('test', 'user-123', false);

			const validUrls = [
				'https://cdn.discordapp.com/avatars/123/avatar.png',
				'https://media.discordapp.net/avatars/123/avatar.gif',
			];

			for (const url of validUrls) {
				const mockUser = createMockUser(COVA_USER_ID, 'cova_user');
				(mockUser.displayAvatarURL as jest.Mock).mockReturnValue(url);
				mockDiscordService.getUserAsync.mockResolvedValue(mockUser);

				const identity = await getCovaIdentityFromService(message as any, true); // Force refresh

				expect(identity).not.toBeNull();
				expect(identity!.avatarUrl).toBe(url);
			}
		});
	});

	describe('Caching Behavior', () => {
		it('should cache identity data for guild context', async () => {
			const guildId = 'test-guild-123';
			const message = new MockDiscordMessage('test', 'user-123', false, guildId);

			const mockMember = createMockGuildMember(COVA_USER_ID, 'CachedCova', guildId);
			mockDiscordService.getMemberAsync.mockResolvedValue(mockMember);

			// First call
			const identity1 = await getCovaIdentityFromService(message as any);
			// Second call
			const identity2 = await getCovaIdentityFromService(message as any);

			expect(identity1).toEqual(identity2);
			expect(mockDiscordService.getMemberAsync).toHaveBeenCalledTimes(1);
		});

		it('should cache identity data for global context', async () => {
			const message = new MockDiscordMessage('test', 'user-123', false); // No guild

			const mockUser = createMockUser(COVA_USER_ID, 'GlobalCova');
			mockDiscordService.getUserAsync.mockResolvedValue(mockUser);

			// First call
			const identity1 = await getCovaIdentityFromService(message as any);
			// Second call
			const identity2 = await getCovaIdentityFromService(message as any);

			expect(identity1).toEqual(identity2);
			expect(mockDiscordService.getUserAsync).toHaveBeenCalledTimes(1);
		});

		it('should use separate cache entries for different guilds', async () => {
			const guild1Message = new MockDiscordMessage('test', 'user-123', false, 'guild-1');
			const guild2Message = new MockDiscordMessage('test', 'user-123', false, 'guild-2');

			const mockMember1 = createMockGuildMember(COVA_USER_ID, 'Guild1Cova', 'guild-1');
			const mockMember2 = createMockGuildMember(COVA_USER_ID, 'Guild2Cova', 'guild-2');

			mockDiscordService.getMemberAsync.mockResolvedValueOnce(mockMember1).mockResolvedValueOnce(mockMember2);

			const identity1 = await getCovaIdentityFromService(guild1Message as any);
			const identity2 = await getCovaIdentityFromService(guild2Message as any);

			expect(identity1!.botName).toBe('Guild1Cova');
			expect(identity2!.botName).toBe('Guild2Cova');
			expect(mockDiscordService.getMemberAsync).toHaveBeenCalledTimes(2);
		});

		it('should respect cache expiration', async () => {
			const message = new MockDiscordMessage('test', 'user-123', false);

			const mockUser = createMockUser(COVA_USER_ID, 'ExpiredCova');
			mockDiscordService.getUserAsync.mockResolvedValue(mockUser);

			// First call
			await getCovaIdentityFromService(message as any);

			// Mock time passage (5+ minutes)
			const originalNow = Date.now;
			Date.now = jest.fn().mockReturnValue(originalNow() + 6 * 60 * 1000);

			try {
				// Second call after cache expiration
				await getCovaIdentityFromService(message as any);

				expect(mockDiscordService.getUserAsync).toHaveBeenCalledTimes(2);
			} finally {
				Date.now = originalNow;
			}
		});

		it('should force refresh when requested', async () => {
			const message = new MockDiscordMessage('test', 'user-123', false);

			const mockUser = createMockUser(COVA_USER_ID, 'RefreshCova');
			mockDiscordService.getUserAsync.mockResolvedValue(mockUser);

			// First call
			await getCovaIdentityFromService(message as any);
			// Second call with force refresh
			await getCovaIdentityFromService(message as any, true);

			expect(mockDiscordService.getUserAsync).toHaveBeenCalledTimes(2);
		});
	});

	describe('Error Handling', () => {
		it('should return null when Discord service fails', async () => {
			const message = new MockDiscordMessage('test', 'user-123', false);

			mockDiscordService.getUserAsync.mockRejectedValue(new Error('Discord API error'));

			const identity = await getCovaIdentityFromService(message as any);

			expect(identity).toBeNull();
		});

		it('should return null when user not found', async () => {
			const message = new MockDiscordMessage('test', 'user-123', false);

			mockDiscordService.getUserAsync.mockResolvedValue(null);

			const identity = await getCovaIdentityFromService(message as any);

			expect(identity).toBeNull();
		});

		it('should handle missing Discord service gracefully', async () => {
			const message = new MockDiscordMessage('test', 'user-123', false);

			mockContainer.get.mockReturnValue(null);

			const identity = await getCovaIdentityFromService(message as any);

			expect(identity).toBeNull();
		});
	});

	describe('Cache Management', () => {
		it('should clear cache completely', async () => {
			const message = new MockDiscordMessage('test', 'user-123', false);

			const mockUser = createMockUser(COVA_USER_ID, 'ClearCova');
			mockDiscordService.getUserAsync.mockResolvedValue(mockUser);

			// Populate cache
			await getCovaIdentityFromService(message as any);

			// Clear cache
			clearIdentityCache();

			// Next call should hit Discord service again
			await getCovaIdentityFromService(message as any);

			expect(mockDiscordService.getUserAsync).toHaveBeenCalledTimes(2);
		});

		it('should provide cache statistics', async () => {
			const guild1Message = new MockDiscordMessage('test', 'user-123', false, 'guild-1');
			const guild2Message = new MockDiscordMessage('test', 'user-123', false, 'guild-2');

			const mockMember = createMockGuildMember(COVA_USER_ID, 'StatsCova');
			mockDiscordService.getMemberAsync.mockResolvedValue(mockMember);

			// Populate cache with multiple entries
			await getCovaIdentityFromService(guild1Message as any);
			await getCovaIdentityFromService(guild2Message as any);

			const stats = getIdentityCacheStats();

			expect(stats.entries).toBe(2);
			expect(stats.keys).toContain('guild-1');
			expect(stats.keys).toContain('guild-2');
		});

		it('should pre-warm cache for multiple guilds', async () => {
			const guildIds = ['guild-1', 'guild-2', 'guild-3'];

			const mockMember = createMockGuildMember(COVA_USER_ID, 'PrewarmCova');
			mockDiscordService.getMemberAsync.mockResolvedValue(mockMember);

			await preWarmIdentityCache(guildIds);

			const stats = getIdentityCacheStats();
			expect(stats.entries).toBe(guildIds.length);
			expect(mockDiscordService.getMemberAsync).toHaveBeenCalledTimes(guildIds.length);
		});
	});

	describe('Backward Compatibility', () => {
		it('should maintain compatibility with getCovaIdentity function', async () => {
			const message = new MockDiscordMessage('test', 'user-123', false);

			const mockUser = createMockUser(COVA_USER_ID, 'CompatCova');
			mockDiscordService.getUserAsync.mockResolvedValue(mockUser);

			const identity = await getCovaIdentity(message as any);

			expect(identity).toEqual({
				botName: 'CompatCova',
				avatarUrl: expect.any(String),
			});
		});
	});
});
