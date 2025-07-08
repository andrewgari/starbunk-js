import { CovaIdentityService } from '../../services/identity';
import { container, ServiceId } from '@starbunk/shared';
import { Message } from 'discord.js';

// Mock the shared container and DiscordService
jest.mock('@starbunk/shared', () => ({
	container: {
		get: jest.fn(),
	},
	ServiceId: {
		DiscordService: Symbol('DiscordService'),
	},
	logger: {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
	},
}));

describe('CovaIdentityService', () => {
	const mockDiscordService = {
		getMemberAsync: jest.fn(),
		getUserAsync: jest.fn(),
	};

	const mockMember = {
		nickname: 'ServerCova',
		user: {
			globalName: 'GlobalCova',
			username: 'cova_user',
		},
		displayAvatarURL: jest.fn(() => 'https://cdn.discordapp.com/avatars/123/server-avatar.png'),
	};

	const mockUser = {
		globalName: 'GlobalCova',
		username: 'cova_user',
		displayAvatarURL: jest.fn(() => 'https://cdn.discordapp.com/avatars/123/global-avatar.png'),
	};

	const mockMessage = {
		guild: {
			id: 'test-guild-123',
		},
	} as Message;

	beforeEach(() => {
		jest.clearAllMocks();
		(container.get as jest.Mock).mockReturnValue(mockDiscordService);
		CovaIdentityService.clearCache();
	});

	describe('getCovaIdentity', () => {
		it('should return server-specific identity when message has guild context', async () => {
			// Arrange
			mockDiscordService.getMemberAsync.mockResolvedValue(mockMember);

			// Act
			const identity = await CovaIdentityService.getCovaIdentity(mockMessage);

			// Assert
			expect(identity).toEqual({
				botName: 'ServerCova',
				avatarUrl: 'https://cdn.discordapp.com/avatars/123/server-avatar.png',
			});
			expect(mockDiscordService.getMemberAsync).toHaveBeenCalledWith('test-guild-123', '139592376443338752');
		});

		it('should fall back to global name when no server nickname', async () => {
			// Arrange
			const memberWithoutNickname = {
				...mockMember,
				nickname: null,
			};
			mockDiscordService.getMemberAsync.mockResolvedValue(memberWithoutNickname);

			// Act
			const identity = await CovaIdentityService.getCovaIdentity(mockMessage);

			// Assert
			expect(identity).toEqual({
				botName: 'GlobalCova',
				avatarUrl: 'https://cdn.discordapp.com/avatars/123/server-avatar.png',
			});
		});

		it('should fall back to username when no nickname or global name', async () => {
			// Arrange
			const memberWithoutNames = {
				...mockMember,
				nickname: null,
				user: {
					...mockMember.user,
					globalName: null,
				},
			};
			mockDiscordService.getMemberAsync.mockResolvedValue(memberWithoutNames);

			// Act
			const identity = await CovaIdentityService.getCovaIdentity(mockMessage);

			// Assert
			expect(identity).toEqual({
				botName: 'cova_user',
				avatarUrl: 'https://cdn.discordapp.com/avatars/123/server-avatar.png',
			});
		});

		it('should return null when member not found in guild', async () => {
			// Arrange
			mockDiscordService.getMemberAsync.mockResolvedValue(null);

			// Act
			const identity = await CovaIdentityService.getCovaIdentity(mockMessage);

			// Assert
			expect(identity).toBeNull();
		});

		it('should return null when no valid avatar URL', async () => {
			// Arrange
			const memberWithoutAvatar = {
				...mockMember,
				displayAvatarURL: jest.fn(() => null),
				user: {
					...mockMember.user,
					displayAvatarURL: jest.fn(() => null),
				},
			};
			mockDiscordService.getMemberAsync.mockResolvedValue(memberWithoutAvatar);

			// Act
			const identity = await CovaIdentityService.getCovaIdentity(mockMessage);

			// Assert
			expect(identity).toBeNull();
		});

		it('should use cache for subsequent requests', async () => {
			// Arrange
			mockDiscordService.getMemberAsync.mockResolvedValue(mockMember);

			// Act
			const identity1 = await CovaIdentityService.getCovaIdentity(mockMessage);
			const identity2 = await CovaIdentityService.getCovaIdentity(mockMessage);

			// Assert
			expect(identity1).toEqual(identity2);
			expect(mockDiscordService.getMemberAsync).toHaveBeenCalledTimes(1);
		});

		it('should force refresh when requested', async () => {
			// Arrange
			mockDiscordService.getMemberAsync.mockResolvedValue(mockMember);

			// Act
			await CovaIdentityService.getCovaIdentity(mockMessage);
			const identity = await CovaIdentityService.getCovaIdentity(mockMessage, true);

			// Assert
			expect(identity).toEqual({
				botName: 'ServerCova',
				avatarUrl: 'https://cdn.discordapp.com/avatars/123/server-avatar.png',
			});
			expect(mockDiscordService.getMemberAsync).toHaveBeenCalledTimes(2);
		});

		it('should handle global identity when no guild context', async () => {
			// Arrange
			const messageWithoutGuild = {} as Message;
			mockDiscordService.getUserAsync.mockResolvedValue(mockUser);

			// Act
			const identity = await CovaIdentityService.getCovaIdentity(messageWithoutGuild);

			// Assert
			expect(identity).toEqual({
				botName: 'GlobalCova',
				avatarUrl: 'https://cdn.discordapp.com/avatars/123/global-avatar.png',
			});
			expect(mockDiscordService.getUserAsync).toHaveBeenCalledWith('139592376443338752');
		});
	});

	describe('cache management', () => {
		it('should clear cache correctly', async () => {
			// Arrange
			mockDiscordService.getMemberAsync.mockResolvedValue(mockMember);
			await CovaIdentityService.getCovaIdentity(mockMessage);

			// Act
			CovaIdentityService.clearCache();
			await CovaIdentityService.getCovaIdentity(mockMessage);

			// Assert
			expect(mockDiscordService.getMemberAsync).toHaveBeenCalledTimes(2);
		});

		it('should return cache statistics', async () => {
			// Arrange
			mockDiscordService.getMemberAsync.mockResolvedValue(mockMember);
			await CovaIdentityService.getCovaIdentity(mockMessage);

			// Act
			const stats = CovaIdentityService.getCacheStats();

			// Assert
			expect(stats.entries).toBe(1);
			expect(stats.keys).toContain('test-guild-123');
		});
	});
});
