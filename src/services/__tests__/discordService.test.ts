import { Client, Collection } from 'discord.js';
import { DiscordService } from '../discordService';
import { UserNotFoundError } from '../errors/discordErrors';
import { WebhookService } from '../services';

// Mock guild IDs
jest.mock('../../discord/guildIds', () => ({
	StarbunkCrusaders: 'guild123',
	AnotherGuild: 'guild456'
}));

// Extend Collection with a mock implementation that covers just our test case
class MockCollection<K, V> extends Collection<K, V> {
	constructor(private mockGet: (key: K) => V | undefined, private mockHas: (key: K) => boolean) {
		super();
	}

	get(key: K): V | undefined {
		return this.mockGet(key);
	}

	has(key: K): boolean {
		return this.mockHas(key);
	}
}

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

		// Create mock Collections for user cache
		const mockUserCollection = new MockCollection<string, typeof mockUser>(
			(id) => id === 'user123' ? mockUser : undefined,
			(id) => id === 'user123'
		);

		// Create bare minimum mock objects
		mockClient = {
			users: {
				cache: mockUserCollection
			}
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
			const user = discordService.getUser('user123');

			expect(user.id).toBe('user123');
			expect(user.username).toBe('testUser');
		});

		it('should throw an error when user not found', () => {
			expect(() => discordService.getUser('nonexistent')).toThrow(UserNotFoundError);
		});
	});
});
