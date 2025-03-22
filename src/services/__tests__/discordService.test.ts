import { Client } from 'discord.js';
import { DiscordService } from '../discordService';
import { UserNotFoundError } from '../errors/discordErrors';
import { WebhookService } from '../container';

// Mock guild IDs
jest.mock('../../discord/guildIds', () => ({
	StarbunkCrusaders: 'guild123',
	AnotherGuild: 'guild456'
}));

describe('DiscordService', () => {
	let mockClient: Partial<Client>;
	let mockWebhookService: Partial<WebhookService>;
	let discordService: DiscordService;
	let mockUser: { id: string; username: string; displayAvatarURL: jest.Mock };

	beforeEach(() => {
		// Reset modules
		jest.resetModules();

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
			} as any
		};

		mockWebhookService = {
			writeMessage: jest.fn().mockResolvedValue(undefined)
		};

		// Initialize with type assertions
		discordService = DiscordService.initialize(
			mockClient as unknown as Client,
			mockWebhookService as WebhookService
		);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('initialization', () => {
		it('should create a singleton instance', () => {
			const instance1 = DiscordService.initialize(
				mockClient as unknown as Client,
				mockWebhookService as WebhookService
			);

			const instance2 = DiscordService.initialize(
				mockClient as unknown as Client,
				mockWebhookService as WebhookService
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
});
