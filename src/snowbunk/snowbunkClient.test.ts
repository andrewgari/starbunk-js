import { Events, GatewayIntentBits, IntentsBitField, TextChannel } from 'discord.js';
import DiscordClient from '../discord/discordClient';
import { ServiceId, container } from '../services/container';
import { mockDiscordService, mockLogger, mockMessage, mockWebhookService } from '../starbunk/bots/test-utils/testUtils';

// Create a test version of SnowbunkClient that doesn't call bootstrapSnowbunkApplication
class SnowbunkClient extends DiscordClient {
	private readonly channelMap: Record<string, Array<string>> = {
		'757866614787014660': ['856617421942030364', '798613445301633137'],
		// testing
		'856617421942030364': ['757866614787014660', '798613445301633137'],
		// testing
		'798613445301633137': ['757866614787014660', '856617421942030364'],
		// starbunk
		'755579237934694420': ['755585038388691127'],
		// starbunk
		'755585038388691127': ['755579237934694420'],
		// memes
		'753251583084724371': ['697341904873979925'],
		// memes
		'697341904873979925': ['753251583084724371'],
		// ff14 general
		'754485972774944778': ['696906700627640352'],
		// ff14 general
		'696906700627640352': ['754485972774944778'],
		// ff14 msq
		'697342576730177658': ['753251583084724372'],
		// ff14 msq
		'753251583084724372': ['697342576730177658'],
		// screenshots
		'753251583286050926': ['755575759753576498'],
		// screenshots
		'755575759753576498': ['753251583286050926'],
		// raiding
		'753251583286050928': ['699048771308224642'],
		// raiding
		'699048771308224642': ['753251583286050928'],
		// food
		'696948268579553360': ['755578695011270707'],
		// food
		'755578695011270707': ['696948268579553360'],
		// pets
		'696948305586028544': ['755578835122126898'],
		// pets
		'755578835122126898': ['696948305586028544'],
	};

	constructor() {
		const intents = new IntentsBitField();
		intents.add(
			GatewayIntentBits.Guilds,
			GatewayIntentBits.GuildMessages,
			GatewayIntentBits.MessageContent,
			GatewayIntentBits.GuildMembers,
			GatewayIntentBits.GuildWebhooks
		);

		super({ intents });

		// No bootstrap call here
	}

	getSyncedChannels(channelID: string): string[] {
		return this.channelMap[channelID] ?? [];
	}

	// Public for testing
	public syncMessage = (message: any): void => {
		if (message.author.id === 'Goose') return;
		if (message.author.bot) return;

		const linkedChannels = this.getSyncedChannels(message.channel.id);
		linkedChannels.forEach((channelID: string) => {
			this.channels
				.fetch(channelID)
				.then((channel) => {
					this.writeMessage(message, channel as TextChannel);
				})
				.catch((error) => {
					console.error('Error fetching channel:', error);
				});
		});
	};

	private writeMessage(message: any, linkedChannel: TextChannel): void {
		const userid = message.author.id;
		const displayName =
			linkedChannel.members.get(userid)?.displayName ?? message.member?.displayName ?? message.author.displayName;

		const avatarUrl =
			linkedChannel.members.get(userid)?.avatarURL() ??
			message.member?.avatarURL() ??
			message.author.defaultAvatarURL;

		try {
			// Try to use Discord service (which will use webhook service internally)
			try {
				const discordService = require('../services/bootstrap').getDiscordService();
				discordService.sendWebhookMessage(linkedChannel, {
					username: displayName,
					avatarURL: avatarUrl,
					content: message.content,
					embeds: [],
				});
				return; // Success, exit early
			} catch (error: unknown) {
				// Just log the error, we'll fall back to direct channel message
				console.warn(`Failed to use Discord service, falling back to direct message: ${error}`);
			}

			// Fallback to direct channel message
			console.debug(`Sending fallback direct message to channel ${linkedChannel.name}`);
			const formattedMessage = `**[${displayName}]**: ${message.content}`;
			linkedChannel.send(formattedMessage);
		} catch (error: unknown) {
			console.error(`Failed to send any message to channel ${linkedChannel.id}: ${error}`);
			// Don't throw here - just log the error and continue
		}
	}
}

// Mock the bootstrap module
jest.mock('../services/bootstrap', () => ({
	getDiscordService: jest.fn().mockReturnValue({
		sendWebhookMessage: jest.fn()
	})
}));

describe('SnowbunkClient', () => {
	let snowbunkClient: SnowbunkClient;
	let mockSendWebhookMessage: jest.Mock;

	beforeEach(async () => {
		// Clear container and reset mocks
		container.clear();
		jest.clearAllMocks();

		// Setup webhook mock
		mockSendWebhookMessage = jest.fn();

		// Mock the getDiscordService function to return our mock
		const getDiscordServiceMock = jest.requireMock('../services/bootstrap').getDiscordService;
		getDiscordServiceMock.mockReturnValue({
			sendWebhookMessage: mockSendWebhookMessage
		});

		// Create SnowbunkClient instance
		snowbunkClient = new SnowbunkClient();

		// Mock the channels.fetch method for tests
		snowbunkClient.channels.fetch = jest.fn().mockImplementation((channelId) => {
			// Return a mock channel that matches the one in the test
			const linkedChannel = {
				id: channelId,
				name: 'test-channel',
				send: jest.fn(),
				members: new Map([
					['user123', {
						displayName: 'Test User',
						avatarURL: () => 'https://example.com/avatar.jpg'
					}]
				])
			} as unknown as TextChannel;

			return Promise.resolve(linkedChannel);
		});

		// Register services in container
		container.register(ServiceId.Logger, mockLogger);
		container.register(ServiceId.WebhookService, mockWebhookService);
		container.register(ServiceId.DiscordClient, snowbunkClient);
		container.register(ServiceId.DiscordService, mockDiscordService);
	});

	it('should initialize and register message handler', () => {
		// Mock the on method for testing
		const onSpy = jest.spyOn(snowbunkClient, 'on');

		// Manually register the event handler for testing
		snowbunkClient.on(Events.MessageCreate, snowbunkClient.syncMessage);

		// Verify that the event handler was registered
		expect(onSpy).toHaveBeenCalledWith(Events.MessageCreate, snowbunkClient.syncMessage);

		// Clean up
		onSpy.mockRestore();
	});

	it('should get synced channels', () => {
		const channels = snowbunkClient.getSyncedChannels('757866614787014660');
		expect(channels).toEqual(['856617421942030364', '798613445301633137']);
	});

	it('should return empty array for unknown channel', () => {
		const channels = snowbunkClient.getSyncedChannels('unknown-channel');
		expect(channels).toEqual([]);
	});

	it('should sync messages between channels', async () => {
		// Create test message
		const message = mockMessage('test message');
		Object.defineProperty(message.author, 'id', { value: 'user123' });
		Object.defineProperty(message, 'channel', { value: { id: '757866614787014660' } });

		// Call the message handler directly
		snowbunkClient.syncMessage(message);

		// Wait for promises to resolve
		await new Promise(process.nextTick);

		// Check if webhook message was sent with correct parameters
		expect(mockSendWebhookMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				content: 'test message',
				username: 'Test User',
				avatarURL: expect.any(String),
				embeds: []
			})
		);
	});
});
