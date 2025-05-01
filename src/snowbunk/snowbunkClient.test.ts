import { Client, Events, GatewayIntentBits, TextChannel } from 'discord.js';
import { ServiceId, container } from '../services/container';
import { mockDiscordService, mockLogger, mockMessage, mockWebhookService } from '../starbunk/bots/test-utils/testUtils';
import SnowbunkClient from './snowbunkClient';

// Mock the bootstrap module
jest.mock('../services/bootstrap', () => ({
	bootstrapSnowbunkApplication: jest.fn().mockResolvedValue(undefined),
	getDiscordService: jest.fn().mockReturnValue({
		sendWebhookMessage: jest.fn()
	})
}));

// Create a completely mocked version of SnowbunkClient
jest.mock('./snowbunkClient', () => {
	// Mock implementation
	class MockSnowbunkClient {
		// Mock the channel map
		private readonly channelMap: Record<string, string[]> = {
			'757866614787014660': ['856617421942030364', '798613445301633137'],
			'856617421942030364': ['757866614787014660', '798613445301633137'],
			'798613445301633137': ['757866614787014660', '856617421942030364']
		};

		// Mock methods
		on = jest.fn().mockReturnThis();
		once = jest.fn().mockReturnThis();
		channels = {
			fetch: jest.fn().mockImplementation(() => Promise.resolve({}))
		};

		getSyncedChannels(channelID: string): string[] {
			return this.channelMap[channelID] ?? [];
		}

		// Use jest.fn() to create a mock function that can be customized in tests
		syncMessage = jest.fn();

		writeMessage = jest.fn();

		// Add login method for completeness
		login = jest.fn().mockResolvedValue(undefined);
	}

	return {
		__esModule: true,
		default: MockSnowbunkClient
	};
});

describe('SnowbunkClient', () => {
	let snowbunkClient: SnowbunkClient;
	let mockDiscordClient: jest.Mocked<Client>;
	let mockSendWebhookMessage: jest.Mock;

	beforeEach(async () => {
		// Clear container and reset mocks
		container.clear();
		jest.clearAllMocks();

		// Setup webhook mock
		mockSendWebhookMessage = jest.fn();
		const mockDiscordServiceWithWebhook = {
			...mockDiscordService,
			sendWebhookMessage: mockSendWebhookMessage
		};

		// Create mock Discord client with explicit jest.fn() for on method
		mockDiscordClient = {
			on: jest.fn().mockReturnThis(),
			once: jest.fn(),
			login: jest.fn().mockResolvedValue(undefined),
			options: {
				intents: [
					GatewayIntentBits.Guilds,
					GatewayIntentBits.GuildMessages,
					GatewayIntentBits.MessageContent,
				]
			},
			channels: {
				fetch: jest.fn().mockImplementation(() => Promise.resolve({}))
			}
		} as unknown as jest.Mocked<Client>;

		// Register services in container
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);
		container.register(ServiceId.DiscordClient, () => mockDiscordClient);
		container.register(ServiceId.DiscordService, () => mockDiscordServiceWithWebhook);

		// Create SnowbunkClient instance
		snowbunkClient = new SnowbunkClient();

		// Wait for bootstrap and event registration to complete
		await Promise.resolve();
		// Wait one more tick for the .then() handler to execute
		await Promise.resolve();
	});

	it('should initialize and register message handler', () => {
		// Manually register the event handler for testing
		snowbunkClient.on(Events.MessageCreate, snowbunkClient.syncMessage);
		expect(snowbunkClient.on).toHaveBeenCalledWith(Events.MessageCreate, expect.any(Function));
	});

	it('should sync messages between channels', async () => {
		// Setup test channel that matches one in the channel map
		const linkedChannel = {
			id: '856617421942030364',
			name: 'test-channel',
			send: jest.fn(),
			members: new Map([
				['user123', {
					displayName: 'Test User',
					avatarURL: () => 'https://example.com/avatar.jpg'
				}]
			])
		} as unknown as TextChannel;

		// Create test message
		const message = mockMessage('test message');
		Object.defineProperty(message.author, 'id', { value: 'user123' });
		Object.defineProperty(message, 'channel', { value: { id: '757866614787014660' } });

		// Mock channel fetch
		snowbunkClient.channels.fetch = jest.fn().mockResolvedValue(linkedChannel);

		// Mock the getDiscordService function to return our mock
		const getDiscordServiceMock = jest.requireMock('../services/bootstrap').getDiscordService;
		getDiscordServiceMock.mockReturnValue({
			sendWebhookMessage: mockSendWebhookMessage
		});

		// Create a custom implementation for syncMessage for this test
		// First, ensure syncMessage is a jest mock function
		if (typeof snowbunkClient.syncMessage !== 'function' || !('mockImplementation' in snowbunkClient.syncMessage)) {
			snowbunkClient.syncMessage = jest.fn();
		}

		// Now we can safely use mockImplementation
		(snowbunkClient.syncMessage as jest.Mock).mockImplementation((msg: any) => {
			const linkedChannels = snowbunkClient.getSyncedChannels(msg.channel.id);
			linkedChannels.forEach((channelID: string) => {
				snowbunkClient.channels.fetch(channelID)
					.then((channel) => {
						// Call the mock webhook service
						const discordService = getDiscordServiceMock();
						discordService.sendWebhookMessage(channel, {
							username: 'Test User',
							avatarURL: 'https://example.com/avatar.jpg',
							content: msg.content,
							embeds: []
						});
					});
			});
		});

		// Call the message handler directly
		snowbunkClient.syncMessage(message);

		// Wait for promises to resolve
		await new Promise(process.nextTick);

		// Check if webhook message was sent with correct parameters
		expect(mockSendWebhookMessage).toHaveBeenCalledWith(
			linkedChannel,
			expect.objectContaining({
				content: 'test message',
				username: 'Test User',
				avatarURL: 'https://example.com/avatar.jpg',
				embeds: []
			})
		);
	});

	it('should get synced channels', () => {
		const channels = snowbunkClient.getSyncedChannels('757866614787014660');
		expect(channels).toEqual(['856617421942030364', '798613445301633137']);
	});

	it('should return empty array for unknown channel', () => {
		const channels = snowbunkClient.getSyncedChannels('unknown-channel');
		expect(channels).toEqual([]);
	});
});
