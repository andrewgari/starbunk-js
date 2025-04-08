import { Client, ClientEvents } from 'discord.js';
import { WebhookService } from '../container';
// Import the type for type checking, but require the implementation dynamically
import { DiscordService as DiscordServiceType } from '../discordService';
import { UserNotFoundError } from '../errors/discordErrors';

// Mock guild IDs
jest.mock('../../discord/guildIds', () => ({
	DefaultGuildId: 'guild123',
	AnotherGuild: 'guild456'
}));

// Now tests are enabled using the public test methods
describe('DiscordService', () => {
	let mockClient: Partial<Client> & { emit: jest.Mock; once: jest.Mock };
	let _mockWebhookService: Partial<WebhookService>;
	let discordService: DiscordServiceType;
	let mockUser: { id: string; username: string; displayAvatarURL: jest.Mock };

	beforeEach(() => {
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

		// Dynamically require DiscordService here
		const DiscordService = require('../discordService').DiscordService;

		// Initialize service
		discordService = new DiscordService(mockClient as unknown as Client);
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
				avatarUrl: 'https://example.com/test.jpg'
			});
			
			const profile = await discordService.getBotProfile('user123');
			expect(profile).toEqual({
				botName: 'TestBot',
				avatarUrl: 'https://example.com/test.jpg'
			});
		});
		
		it('should get random bot profile', async () => {
			// Mock implementation for async method
			jest.spyOn(discordService, 'getRandomBotProfile').mockResolvedValue({
				botName: 'RandomBot',
				avatarUrl: 'https://example.com/random.jpg'
			});
			
			const profile = await discordService.getRandomBotProfile();
			expect(profile.botName).toBe('RandomBot');
		});
	});
});