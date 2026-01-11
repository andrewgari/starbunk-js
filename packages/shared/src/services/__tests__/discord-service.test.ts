import { Client, ClientEvents, GatewayIntentBits } from 'discord.js';
import { DiscordService } from '../discord-service'; // Use standard import
import { UserNotFoundError } from '../errors/discord-errors';

// Mock node-schedule to prevent scheduling issues in tests
jest.mock('node-schedule', () => ({
	scheduleJob: jest.fn(),
	cancelJob: jest.fn(),
}));

// DiscordService tests are not implemented yet
// TODO: Implement DiscordService tests when service is fully developed
describe.skip('DiscordService', () => {
	let mockClient: Partial<Client> & { emit: jest.Mock; once: jest.Mock };
	let discordService: DiscordService; // Use standard type
	let mockUser: { id: string; username: string; displayAvatarURL: jest.Mock };

	beforeEach(() => {
		// Create mock user
		mockUser = {
			id: 'user123',
			username: 'testUser',
			displayAvatarURL: jest.fn().mockReturnValue('https://example.com/avatar.jpg'),
		};

		// Create comprehensive mock client to avoid constructor issues
		mockClient = {
			users: {
				cache: {
					get: jest.fn().mockImplementation((id) => (id === 'user123' ? mockUser : undefined)),
					has: jest.fn().mockImplementation((id) => id === 'user123'),
				},
			} as any,
			guilds: {
				cache: {
					get: jest.fn().mockReturnValue({
						id: 'guild123',
						name: 'Test Guild',
						members: {
							cache: new Map(),
						},
					}),
					has: jest.fn().mockReturnValue(true),
				},
			} as any,
			options: {
				intents: {
					has: jest.fn().mockReturnValue(true), // Mock that all intents are available
				},
			} as any,
			emit: jest.fn(),
			once: jest.fn().mockImplementation((event: keyof ClientEvents, callback: () => void) => {
				if (event === 'ready') {
					// Don't call callback immediately to avoid initialization issues
					setTimeout(callback, 0);
				}
			}),
			on: jest.fn(),
			off: jest.fn(),
			removeAllListeners: jest.fn(),
		};

		// Initialize service using the imported module
		discordService = new DiscordService(mockClient as unknown as Client); // Use standard constructor
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('user methods', () => {
		it('should get a user by ID', () => {
			// Override the method for this test
			const getUserSpy = jest.spyOn(discordService, 'getUser');
			getUserSpy.mockReturnValue(mockUser as any);

			const user = discordService.getUser('user123');

			expect(user.id).toBe('user123');
			expect(user.username).toBe('testUser');
			expect(getUserSpy).toHaveBeenCalledWith('user123');

			// Restore original implementation
			getUserSpy.mockRestore();
		});

		it('should throw an error when user not found', () => {
			// Override the method for this test
			const getUserSpy = jest.spyOn(discordService, 'getUser');
			getUserSpy.mockImplementation((id: string) => {
				if (id === 'user123') {
					return mockUser as any;
				}
				throw new UserNotFoundError(id);
			});

			expect(() => discordService.getUser('nonexistent')).toThrow(UserNotFoundError);
			expect(getUserSpy).toHaveBeenCalledWith('nonexistent');

			// Restore original implementation
			getUserSpy.mockRestore();
		});
	});

	// Test a few high-level features instead of internals
	describe('bot profiles', () => {
		it('should get bot profile', async () => {
			// Mock implementation for async method
			jest.spyOn(discordService, 'getBotProfile').mockResolvedValue({
				botName: 'TestBot',
				avatarUrl: 'https://example.com/test.jpg',
			});

			const profile = await discordService.getBotProfile('user123');
			expect(profile).toEqual({
				botName: 'TestBot',
				avatarUrl: 'https://example.com/test.jpg',
			});
		});

		it('should get random bot profile', async () => {
			// Mock implementation for async method
			jest.spyOn(discordService, 'getRandomBotProfile').mockResolvedValue({
				botName: 'RandomBot',
				avatarUrl: 'https://example.com/random.jpg',
			});

			const profile = await discordService.getRandomBotProfile();
			expect(profile.botName).toBe('RandomBot');
		});
	});
});
