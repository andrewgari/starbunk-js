import { Client, GatewayIntentBits, TextChannel } from 'discord.js';
import { ServiceId, container } from '../services/container';
import { mockLogger, mockMessage, mockWebhookService } from '../starbunk/bots/test-utils/testUtils';
import SnowbunkClient from './snowbunkClient';

describe('SnowbunkClient', () => {
	let snowbunkClient: SnowbunkClient;
	let mockDiscordClient: Client;

	beforeEach(() => {
		// Clear container and register mocks
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);

		// Create mock Discord client
		mockDiscordClient = {
			on: jest.fn(),
			login: jest.fn().mockResolvedValue(undefined),
			options: {
				intents: [
					GatewayIntentBits.Guilds,
					GatewayIntentBits.GuildMessages,
					GatewayIntentBits.MessageContent,
				]
			}
		} as unknown as Client;

		container.register(ServiceId.DiscordClient, () => mockDiscordClient);

		// Create SnowbunkClient instance with client options
		snowbunkClient = new SnowbunkClient();
	});

	it('should initialize and register message handler', () => {
		expect(mockDiscordClient.on).toHaveBeenCalledWith('messageCreate', expect.any(Function));
	});

	it('should sync messages between channels', async () => {
		const message = mockMessage('test message');
		const linkedChannel = {
			id: '856617421942030364',
			send: jest.fn(),
		} as unknown as TextChannel;

		// Access the private method through type assertion
		(snowbunkClient as any).writeMessage(message, linkedChannel);

		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			linkedChannel,
			expect.objectContaining({
				content: 'test message'
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
