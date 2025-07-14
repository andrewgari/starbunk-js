import { BotIdentityService } from '../botIdentityService';
import { ConfigurationService } from '../configurationService';
import { Message, Guild, GuildMember, User } from 'discord.js';

// Mock Discord.js objects
const createMockMessage = (guildId: string, userId: string): Partial<Message> => ({
	guild: {
		id: guildId,
		name: 'Test Guild'
	} as Guild,
	author: {
		id: userId,
		username: 'testuser'
	} as User
});

const createMockGuildMember = (
	userId: string, 
	username: string, 
	nickname?: string,
	avatarUrl?: string
): Partial<GuildMember> => ({
	id: userId,
	nickname: nickname || null,
	user: {
		id: userId,
		username: username,
		globalName: username,
		displayAvatarURL: jest.fn().mockReturnValue(avatarUrl || `https://cdn.discordapp.com/avatars/${userId}/avatar.png`)
	} as User,
	displayAvatarURL: jest.fn().mockReturnValue(
		nickname ? `https://cdn.discordapp.com/guilds/123/users/${userId}/avatars/server-avatar.png` : avatarUrl
	)
});

// Mock the DiscordService
jest.mock('@starbunk/shared', () => ({
	container: {
		get: jest.fn().mockReturnValue({
			getMemberAsync: jest.fn(),
			getMemberAsBotIdentity: jest.fn()
		})
	},
	ServiceId: {
		DiscordService: 'DiscordService'
	},
	logger: {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn()
	}
}));

describe('BotIdentityService - Server-Specific Identity Resolution', () => {
	let identityService: BotIdentityService;
	let mockConfigService: jest.Mocked<ConfigurationService>;
	let mockDiscordService: any;

	beforeEach(() => {
		// Mock ConfigurationService
		mockConfigService = {
			getUserIdByUsername: jest.fn(),
			getUserConfig: jest.fn(),
		} as any;

		// Mock DiscordService
		const { container } = require('@starbunk/shared');
		mockDiscordService = container.get();

		identityService = new BotIdentityService(mockConfigService);
	});

	afterEach(() => {
		jest.clearAllMocks();
		identityService.clearCache();
	});

	describe('Server-Specific Nickname Resolution', () => {
		it('should use server nickname over global username', async () => {
			// Arrange
			const userId = '85184539906809856';
			const guildId = '123456789';
			const message = createMockMessage(guildId, 'someuser') as Message;

			mockConfigService.getUserIdByUsername.mockResolvedValue(userId);
			mockConfigService.getUserConfig.mockResolvedValue({
				userId,
				username: 'Chad',
				isActive: true
			});

			const mockMember = createMockGuildMember(
				userId,
				'Chad',
				'Chad "The Machine" Johnson', // Server nickname
				'https://example.com/server-avatar.png'
			);

			mockDiscordService.getMemberAsync.mockResolvedValue(mockMember);

			// Act
			const identity = await identityService.getChadIdentity(message);

			// Assert
			expect(identity).not.toBeNull();
			expect(identity!.botName).toBe('Chad "The Machine" Johnson'); // Should use server nickname
			expect(identity!.avatarUrl).toContain('server-avatar.png'); // Should use server avatar
			expect(mockDiscordService.getMemberAsync).toHaveBeenCalledWith(guildId, userId);
		});

		it('should fall back to username when no server nickname', async () => {
			// Arrange
			const userId = '85184539906809856';
			const guildId = '123456789';
			const message = createMockMessage(guildId, 'someuser') as Message;

			mockConfigService.getUserIdByUsername.mockResolvedValue(userId);
			mockConfigService.getUserConfig.mockResolvedValue({
				userId,
				username: 'Chad',
				isActive: true
			});

			const mockMember = createMockGuildMember(
				userId,
				'Chad',
				null, // No server nickname
				'https://example.com/global-avatar.png'
			);

			mockDiscordService.getMemberAsync.mockResolvedValue(mockMember);

			// Act
			const identity = await identityService.getChadIdentity(message);

			// Assert
			expect(identity).not.toBeNull();
			expect(identity!.botName).toBe('Chad'); // Should use global username
			expect(identity!.avatarUrl).toContain('global-avatar.png');
		});
	});

	describe('Cache Behavior with Server Context', () => {
		it('should cache identities per server', async () => {
			// Arrange
			const userId = '85184539906809856';
			const guild1 = '111111111';
			const guild2 = '222222222';
			const message1 = createMockMessage(guild1, 'someuser') as Message;
			const message2 = createMockMessage(guild2, 'someuser') as Message;

			mockConfigService.getUserIdByUsername.mockResolvedValue(userId);
			mockConfigService.getUserConfig.mockResolvedValue({
				userId,
				username: 'Chad',
				isActive: true
			});

			// Different nicknames in different servers
			const member1 = createMockGuildMember(userId, 'Chad', 'Chad Alpha');
			const member2 = createMockGuildMember(userId, 'Chad', 'Chad Beta');

			mockDiscordService.getMemberAsync
				.mockResolvedValueOnce(member1)
				.mockResolvedValueOnce(member2);

			// Act
			const identity1 = await identityService.getChadIdentity(message1);
			const identity2 = await identityService.getChadIdentity(message2);

			// Assert
			expect(identity1).not.toBeNull();
			expect(identity2).not.toBeNull();
			expect(identity1!.botName).toBe('Chad Alpha');
			expect(identity2!.botName).toBe('Chad Beta');
			expect(mockDiscordService.getMemberAsync).toHaveBeenCalledTimes(2);

			// Verify cache has separate entries (both username and userId keys for each guild)
			const cacheStats = identityService.getCacheStats();
			expect(cacheStats.size).toBe(4); // 2 guilds × 2 cache keys each (username + userId)
			expect(cacheStats.keys).toContain(`username:chad:${guild1}`);
			expect(cacheStats.keys).toContain(`username:chad:${guild2}`);
			expect(cacheStats.keys).toContain(`userId:85184539906809856:${guild1}`);
			expect(cacheStats.keys).toContain(`userId:85184539906809856:${guild2}`);
		});

		it('should use cache for subsequent requests in same server', async () => {
			// Arrange
			const userId = '85184539906809856';
			const guildId = '123456789';
			const message = createMockMessage(guildId, 'someuser') as Message;

			mockConfigService.getUserIdByUsername.mockResolvedValue(userId);
			mockConfigService.getUserConfig.mockResolvedValue({
				userId,
				username: 'Chad',
				isActive: true
			});

			const mockMember = createMockGuildMember(userId, 'Chad', 'Cached Chad');
			mockDiscordService.getMemberAsync.mockResolvedValue(mockMember);

			// Act
			const identity1 = await identityService.getChadIdentity(message);
			const identity2 = await identityService.getChadIdentity(message);

			// Assert
			expect(identity1).not.toBeNull();
			expect(identity2).not.toBeNull();
			expect(identity1!.botName).toBe('Cached Chad');
			expect(identity2!.botName).toBe('Cached Chad');
			expect(mockDiscordService.getMemberAsync).toHaveBeenCalledTimes(1); // Only called once due to cache
		});

		it('should bypass cache when forceRefresh is true', async () => {
			// Arrange
			const userId = '85184539906809856';
			const guildId = '123456789';
			const message = createMockMessage(guildId, 'someuser') as Message;

			mockConfigService.getUserIdByUsername.mockResolvedValue(userId);
			mockConfigService.getUserConfig.mockResolvedValue({
				userId,
				username: 'Chad',
				isActive: true
			});

			const member1 = createMockGuildMember(userId, 'Chad', 'Old Chad');
			const member2 = createMockGuildMember(userId, 'Chad', 'New Chad');

			mockDiscordService.getMemberAsync
				.mockResolvedValueOnce(member1)
				.mockResolvedValueOnce(member2);

			// Act
			const identity1 = await identityService.getChadIdentity(message);
			const identity2 = await identityService.getChadIdentity(message, true); // Force refresh

			// Assert
			expect(identity1).not.toBeNull();
			expect(identity2).not.toBeNull();
			expect(identity1!.botName).toBe('Old Chad');
			expect(identity2!.botName).toBe('New Chad');
			expect(mockDiscordService.getMemberAsync).toHaveBeenCalledTimes(2); // Called twice due to force refresh
		});
	});

	describe('Error Handling and Fallbacks', () => {
		it('should handle user not found in server gracefully', async () => {
			// Arrange
			const userId = '85184539906809856';
			const guildId = '123456789';
			const message = createMockMessage(guildId, 'someuser') as Message;

			mockConfigService.getUserIdByUsername.mockResolvedValue(userId);
			mockConfigService.getUserConfig.mockResolvedValue({
				userId,
				username: 'Chad',
				isActive: true
			});
			mockDiscordService.getMemberAsync.mockResolvedValue(null); // User not in server
			mockDiscordService.getMemberAsBotIdentity.mockResolvedValue({
				botName: 'ChadBot',
				avatarUrl: 'https://example.com/fallback.png'
			});

			// Act
			const identity = await identityService.getChadIdentity(message);

			// Assert
			expect(identity).not.toBeNull();
			expect(identity!.botName).toBe('ChadBot'); // Should use fallback
			expect(identity!.avatarUrl).toContain('fallback.png');
			expect(mockDiscordService.getMemberAsBotIdentity).toHaveBeenCalledWith(userId, false);
		});

		it('should handle Discord API errors gracefully', async () => {
			// Arrange
			const userId = '85184539906809856';
			const guildId = '123456789';
			const message = createMockMessage(guildId, 'someuser') as Message;

			mockConfigService.getUserIdByUsername.mockResolvedValue(userId);
			mockConfigService.getUserConfig.mockResolvedValue({
				userId,
				username: 'Chad',
				isActive: true
			});
			mockDiscordService.getMemberAsync.mockRejectedValue(new Error('Discord API Error'));
			mockDiscordService.getMemberAsBotIdentity.mockResolvedValue({
				botName: 'ChadBot',
				avatarUrl: 'https://example.com/fallback.png'
			});

			// Act
			const identity = await identityService.getChadIdentity(message);

			// Assert
			expect(identity).not.toBeNull();
			expect(identity!.botName).toBe('ChadBot'); // Should use fallback
			expect(mockDiscordService.getMemberAsBotIdentity).toHaveBeenCalled();
		});
	});

	describe('Cache Management', () => {
		it('should clear user cache across all servers', async () => {
			// Arrange
			const userId = '85184539906809856';
			mockConfigService.getUserIdByUsername.mockResolvedValue(userId);
			
			// Create identities in multiple servers
			const message1 = createMockMessage('111', 'user') as Message;
			const message2 = createMockMessage('222', 'user') as Message;
			
			mockDiscordService.getMemberAsync.mockResolvedValue(
				createMockGuildMember(userId, 'Chad', 'Test Chad')
			);

			await identityService.getChadIdentity(message1);
			await identityService.getChadIdentity(message2);

			// Act
			identityService.clearUserCache(userId);

			// Assert
			const cacheStats = identityService.getCacheStats();
			expect(cacheStats.size).toBe(0); // All entries for this user should be cleared
		});
	});
});
