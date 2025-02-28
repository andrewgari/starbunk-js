import { GuildMember, Message, User } from 'discord.js';
import { getUserIdentity } from '../../../../starbunk/bots/identity/userIdentity';

// Mock the guild.members.fetch method
const mockFetch = jest.fn();
jest.mock('discord.js', () => {
	const original = jest.requireActual('discord.js');
	return {
		...original,
		Guild: class {
			members = {
				fetch: mockFetch
			};
		}
	};
});

describe('getUserIdentity', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('when given a Message', () => {
		it('should prioritize member displayName and avatar when available', async () => {
			// Create mock objects
			const mockMember = {
				displayName: 'ServerNickname',
				displayAvatarURL: jest.fn().mockReturnValue('https://example.com/server-avatar.jpg')
			} as unknown as GuildMember;

			const mockAuthor = {
				id: 'user-123',
				displayName: 'AccountDisplayName',
				username: 'AccountUsername',
				displayAvatarURL: jest.fn().mockReturnValue('https://example.com/account-avatar.jpg')
			} as unknown as User;

			// Create a mock message with member information
			const mockMessage = {
				author: mockAuthor,
				member: mockMember,
				guild: null
			} as unknown as Message;

			const identity = await getUserIdentity(mockMessage);

			expect(identity.name).toBe('ServerNickname');
			expect(identity.avatarUrl).toBe('https://example.com/server-avatar.jpg');
		});

		it('should fall back to author displayName and avatar when member is not available', async () => {
			// Create a mock author
			const mockAuthor = {
				id: 'user-123',
				displayName: 'AccountDisplayName',
				username: 'AccountUsername',
				displayAvatarURL: jest.fn().mockReturnValue('https://example.com/account-avatar.jpg')
			} as unknown as User;

			// Create a mock message without member information
			const mockMessage = {
				author: mockAuthor,
				member: null,
				guild: null
			} as unknown as Message;

			const identity = await getUserIdentity(mockMessage);

			expect(identity.name).toBe('AccountDisplayName');
			expect(identity.avatarUrl).toBe('https://example.com/account-avatar.jpg');
		});

		it('should attempt to fetch member if not available but guild is', async () => {
			// Create mock objects
			const mockMember = {
				displayName: 'ServerNickname',
				displayAvatarURL: jest.fn().mockReturnValue('https://example.com/server-avatar.jpg')
			} as unknown as GuildMember;

			const mockAuthor = {
				id: 'user-123',
				displayName: 'AccountDisplayName',
				username: 'AccountUsername',
				displayAvatarURL: jest.fn().mockReturnValue('https://example.com/account-avatar.jpg')
			} as unknown as User;

			const mockGuild = {
				members: {
					fetch: mockFetch
				}
			};

			// Create a mock message with guild but no member
			const mockMessage = {
				author: mockAuthor,
				member: null,
				guild: mockGuild
			} as unknown as Message;

			// Mock the fetch to return the member
			mockFetch.mockResolvedValue(mockMember);

			const identity = await getUserIdentity(mockMessage);

			expect(mockFetch).toHaveBeenCalledWith('user-123');
			expect(identity.name).toBe('ServerNickname');
			expect(identity.avatarUrl).toBe('https://example.com/server-avatar.jpg');
		});

		it('should handle fetch errors gracefully', async () => {
			// Create a mock author
			const mockAuthor = {
				id: 'user-123',
				displayName: 'AccountDisplayName',
				username: 'AccountUsername',
				displayAvatarURL: jest.fn().mockReturnValue('https://example.com/account-avatar.jpg')
			} as unknown as User;

			const mockGuild = {
				members: {
					fetch: mockFetch
				}
			};

			// Create a mock message with guild but no member
			const mockMessage = {
				author: mockAuthor,
				member: null,
				guild: mockGuild
			} as unknown as Message;

			// Mock the fetch to throw an error
			mockFetch.mockRejectedValue(new Error('Failed to fetch member'));

			const identity = await getUserIdentity(mockMessage);

			expect(mockFetch).toHaveBeenCalledWith('user-123');
			expect(identity.name).toBe('AccountDisplayName');
			expect(identity.avatarUrl).toBe('https://example.com/account-avatar.jpg');
		});
	});

	describe('when given a GuildMember', () => {
		it('should use the member displayName and avatar', async () => {
			const mockMember = {
				displayName: 'ServerNickname',
				displayAvatarURL: jest.fn().mockReturnValue('https://example.com/server-avatar.jpg')
			} as unknown as GuildMember;

			const identity = await getUserIdentity(mockMember);

			expect(identity.name).toBe('ServerNickname');
			expect(identity.avatarUrl).toBe('https://example.com/server-avatar.jpg');
		});
	});

	describe('when given a User', () => {
		it('should use the user displayName and avatar', async () => {
			const mockUser = {
				displayName: 'UserDisplayName',
				username: 'UserUsername',
				displayAvatarURL: jest.fn().mockReturnValue('https://example.com/user-avatar.jpg')
			} as unknown as User;

			const identity = await getUserIdentity(mockUser);

			expect(identity.name).toBe('UserDisplayName');
			expect(identity.avatarUrl).toBe('https://example.com/user-avatar.jpg');
		});

		it('should fall back to username if displayName is not available', async () => {
			const mockUser = {
				displayName: undefined,
				username: 'UserUsername',
				displayAvatarURL: jest.fn().mockReturnValue('https://example.com/user-avatar.jpg')
			} as unknown as User;

			const identity = await getUserIdentity(mockUser);

			expect(identity.name).toBe('UserUsername');
			expect(identity.avatarUrl).toBe('https://example.com/user-avatar.jpg');
		});
	});
});
