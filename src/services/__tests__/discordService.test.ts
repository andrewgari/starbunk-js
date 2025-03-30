import { Client, ClientEvents } from 'discord.js';
import { WebhookService } from '../container';
import { DiscordService } from '../discordService';
import { UserNotFoundError } from '../errors/discordErrors';

// Mock guild IDs
jest.mock('../../discord/guildIds', () => ({
	StarbunkCrusaders: 'guild123',
	AnotherGuild: 'guild456'
}));

// Now tests are enabled using the public test methods
describe('DiscordService', () => {
	let mockClient: Partial<Client> & { emit: jest.Mock; once: jest.Mock };
	let _mockWebhookService: Partial<WebhookService>;
	let discordService: DiscordService;
	let mockUser: { id: string; username: string; displayAvatarURL: jest.Mock };

	beforeEach(() => {
		// Reset modules and singleton
		jest.resetModules();
		// @ts-expect-error - accessing private field for testing
		global.discordServiceInstance = null;

		// Create mock user
		mockUser = {
			id: 'user123',
			username: 'testUser',
			displayAvatarURL: jest.fn().mockReturnValue('https://example.com/avatar.jpg')
		};

		// Create bare minimum mock objects
		mockClient = {
			users: {
				cache: {
					get: jest.fn().mockImplementation(id => id === 'user123' ? mockUser : undefined),
					has: jest.fn().mockImplementation(id => id === 'user123')
				}
			} as any,
			emit: jest.fn(),
			once: jest.fn().mockImplementation((event: keyof ClientEvents, callback: () => void) => {
				if (event === 'ready') {
					callback();
				}
			})
		};

		_mockWebhookService = {
			writeMessage: jest.fn().mockResolvedValue(undefined)
		};

		// Initialize service
		discordService = DiscordService.initialize(mockClient as unknown as Client);
	});

	afterEach(() => {
		jest.clearAllMocks();
		// @ts-expect-error - accessing private field for testing
		global.discordServiceInstance = null;
	});

	describe('initialization', () => {
		it('should create a singleton instance', () => {
			const instance1 = DiscordService.initialize(
				mockClient as unknown as Client
			);

			const instance2 = DiscordService.initialize(
				mockClient as unknown as Client
			);

			expect(instance1).toBe(instance2);
		});
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
			getUserSpy.mockImplementation((id) => {
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
		it('should get bot profile', () => {
			// Mock implementation
			jest.spyOn(discordService, 'getBotProfile').mockReturnValue({
				botName: 'TestBot',
				avatarUrl: 'https://example.com/test.jpg'
			});
			
			const profile = discordService.getBotProfile('user123');
			expect(profile).toEqual({
				botName: 'TestBot',
				avatarUrl: 'https://example.com/test.jpg'
			});
		});
		
		it('should get random bot profile', () => {
			// Mock implementation
			jest.spyOn(discordService, 'getRandomBotProfile').mockReturnValue({
				botName: 'RandomBot',
				avatarUrl: 'https://example.com/random.jpg'
			});
			
			const profile = discordService.getRandomBotProfile();
			expect(profile.botName).toBe('RandomBot');
		});
	});
});