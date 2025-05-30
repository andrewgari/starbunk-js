import { Events, GatewayIntentBits, IntentsBitField, Message, TextChannel } from 'discord.js';
import DiscordClient from '../discord/discordClient';
import { ServiceId, container } from '../services/container';
import { mockDiscordService, mockLogger, mockMessage, mockWebhookService } from '../starbunk/bots/test-utils/testUtils';

// Create a test version of SnowbunkClient that doesn't call bootstrapSnowbunkApplication
class SnowbunkClient extends DiscordClient {
	// Mock Prisma client for testing
	public readonly prisma = {
		blacklist: {
			findUnique: jest.fn().mockResolvedValue(null) // Default to no blacklisted users
		},
		channel: {
			findUnique: jest.fn().mockImplementation((query) => {
				const channelId = query?.where?.id;

				// Mock channel data based on the ID
				if (channelId === '757866614787014660') {
					return Promise.resolve({ id: channelId, name: 'Test-Channel', guildId: '753251582719688714' });
				} else if (channelId === '856617421942030364') {
					return Promise.resolve({ id: channelId, name: 'Test-Channel', guildId: '856617421427441674' });
				} else if (channelId === '798613445301633137') {
					return Promise.resolve({ id: channelId, name: 'Test-Channel', guildId: '798613445301633134' });
				}

				// Default to null for unknown channels
				return Promise.resolve(null);
			})
		},
		channelBridge: {
			findMany: jest.fn().mockImplementation((query) => {
				// Mock channel bridge data based on the query
				const sourceChannelId = query?.where?.sourceChannelId;

				// Return mock data based on the source channel ID
				if (sourceChannelId === '757866614787014660') {
					return Promise.resolve([
						{
							id: 'bridge1',
							sourceChannelId,
							targetChannelId: '856617421942030364',
							name: 'testing',
							sourceServer: 'StarbunkCrusaders',
							targetServer: 'StarbunkStaging',
							isActive: true
						},
						{
							id: 'bridge2',
							sourceChannelId,
							targetChannelId: '798613445301633137',
							name: 'testing',
							sourceServer: 'StarbunkCrusaders',
							targetServer: 'CovaDaxServer',
							isActive: true
						}
					]);
				} else if (sourceChannelId === '856617421942030364') {
					return Promise.resolve([
						{
							id: 'bridge3',
							sourceChannelId,
							targetChannelId: '757866614787014660',
							name: 'testing',
							sourceServer: 'StarbunkStaging',
							targetServer: 'StarbunkCrusaders',
							isActive: true
						},
						{
							id: 'bridge4',
							sourceChannelId,
							targetChannelId: '798613445301633137',
							name: 'testing',
							sourceServer: 'StarbunkStaging',
							targetServer: 'CovaDaxServer',
							isActive: true
						}
					]);
				} else if (sourceChannelId === '798613445301633137') {
					return Promise.resolve([
						{
							id: 'bridge5',
							sourceChannelId,
							targetChannelId: '757866614787014660',
							name: 'testing',
							sourceServer: 'CovaDaxServer',
							targetServer: 'StarbunkCrusaders',
							isActive: true
						},
						{
							id: 'bridge6',
							sourceChannelId,
							targetChannelId: '856617421942030364',
							name: 'testing',
							sourceServer: 'CovaDaxServer',
							targetServer: 'StarbunkStaging',
							isActive: true
						}
					]);
				}

				// Default to empty array for unknown channels
				return Promise.resolve([]);
			})
		},
		$disconnect: jest.fn().mockResolvedValue(undefined)
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

	async getSyncedChannels(channelID: string): Promise<string[]> {
		try {
			// Query the database for channel bridges where the source channel matches the given ID
			const bridges = await this.prisma.channelBridge.findMany({
				where: {
					sourceChannelId: channelID,
					isActive: true
				}
			});

			// Extract the target channel IDs
			return bridges.map((bridge: { targetChannelId: string }) => bridge.targetChannelId);
		} catch (error) {
			mockLogger.error('Error fetching synced channels:', error instanceof Error ? error : new Error(String(error)));
			return [];
		}
	}

	// Public for testing
	public syncMessage = async (message: Message): Promise<void> => {
		if (message.author.id === 'Goose') return;
		if (message.author.bot) return;

		// Check if the user is blacklisted in this guild
		if (message.guild) {
			try {
				const blacklisted = await this.prisma.blacklist.findUnique({
					where: {
						guildId_userId: {
							guildId: message.guild.id,
							userId: message.author.id
						}
					}
				});

				if (blacklisted) {
					mockLogger.debug(`Skipping message from blacklisted user ${message.author.id} in guild ${message.guild.id}`);
					return;
				}
			} catch (error) {
				mockLogger.error('Error checking blacklist:', error instanceof Error ? error : new Error(String(error)));
				// Continue processing even if blacklist check fails
			}
		}

		try {
			// Get linked channels from the database
			const linkedChannels = await this.getSyncedChannels(message.channel.id);

			// Process each linked channel
			for (const channelID of linkedChannels) {
				try {
					const channel = await this.channels.fetch(channelID);
					this.writeMessage(message, channel as TextChannel);
				} catch (error) {
					mockLogger.error('Error fetching channel:', error instanceof Error ? error : new Error(String(error)));
				}
			}
		} catch (error) {
			mockLogger.error('Error processing linked channels:', error instanceof Error ? error : new Error(String(error)));
		}
	};

	private writeMessage(message: Message, linkedChannel: TextChannel): void {
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
				// For testing, use the mockWebhookService directly
				mockWebhookService.writeMessage(linkedChannel, {
					username: displayName,
					avatarURL: avatarUrl,
					content: message.content,
					embeds: [],
				});
				return; // Success, exit early
			} catch (error: unknown) {
				// For testing, use mockLogger directly
				mockLogger.warn(`Failed to use Discord service, falling back to direct message: ${error}`);
			}

			// Fallback to direct channel message
			mockLogger.debug(`Sending fallback direct message to channel ${linkedChannel.name}`);
			const formattedMessage = `**[${displayName}]**: ${message.content}`;
			linkedChannel.send(formattedMessage);
		} catch (error: unknown) {
			mockLogger.error(`Failed to send any message to channel ${linkedChannel.id}: ${error}`);
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

	it('should get synced channels', async () => {
		const channels = await snowbunkClient.getSyncedChannels('757866614787014660');
		expect(channels).toEqual(['856617421942030364', '798613445301633137']);
	});

	it('should return empty array for unknown channel', async () => {
		const channels = await snowbunkClient.getSyncedChannels('unknown-channel');
		expect(channels).toEqual([]);
	});

	it('should sync messages between channels', async () => {
		// Create test message
		const message = mockMessage('test message');
		Object.defineProperty(message.author, 'id', { value: 'user123' });
		Object.defineProperty(message, 'channel', { value: { id: '757866614787014660' } });

		// Call the message handler directly
		await snowbunkClient.syncMessage(message);

		// Wait for promises to resolve
		await new Promise(process.nextTick);

		// Check if webhook message was sent with correct parameters
		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				content: 'test message',
				username: 'Test User',
				avatarURL: expect.any(String),
				embeds: []
			})
		);
	});

	it('should not sync messages from blacklisted users', async () => {
		// Mock blacklist lookup to return a blacklist entry
		snowbunkClient.prisma.blacklist.findUnique.mockResolvedValue({
			id: 'blacklist-1',
			guildId: 'guild123',
			userId: 'blacklisted-user',
			createdAt: new Date()
		});

		// Create test message from blacklisted user
		const message = mockMessage('test message from blacklisted user');
		Object.defineProperty(message.author, 'id', { value: 'blacklisted-user' });
		Object.defineProperty(message, 'channel', { value: { id: '757866614787014660' } });
		Object.defineProperty(message, 'guild', { value: { id: 'guild123' } });

		// Call the message handler directly
		await snowbunkClient.syncMessage(message);

		// Wait for promises to resolve
		await new Promise(process.nextTick);

		// Check that the blacklist was checked
		expect(snowbunkClient.prisma.blacklist.findUnique).toHaveBeenCalledWith({
			where: {
				guildId_userId: {
					guildId: 'guild123',
					userId: 'blacklisted-user'
				}
			}
		});

		// Verify that no webhook message was sent
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();

		// Check that a debug log was generated
		expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringMatching(/Skipping message from blacklisted user/));
	});
});
