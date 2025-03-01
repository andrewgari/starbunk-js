import guildIDs from '@/discord/guildIDs';
import userID from '@/discord/userID';
import { Logger } from '@/services/logger';
import SnowbunkClient from '@/snowbunk/snowbunkClient';
import webhookService from '@/webhooks/webhookService';
import { Message, TextChannel, Webhook } from 'discord.js';

jest.mock('@/webhooks/webhookService');
jest.mock('@/services/logger');
jest.mock('@/discord/clientInstance', () => ({
	getClient: jest.fn().mockReturnValue({})
}));

describe('SnowbunkClient Integration Tests', () => {
	let client: SnowbunkClient;
	let mockWebhook: Partial<Webhook>;
	let mockSourceChannel: Partial<TextChannel>;
	let mockTargetChannel: Partial<TextChannel>;
	let mockMessage: Message;

	beforeEach(() => {
		// Set up mock webhook
		mockWebhook = {
			name: 'SnowbunkBunkbot-target-channel',
			send: jest.fn().mockResolvedValue({ id: 'webhook-message-id' })
		};

		// Set up mock source channel (where message originates)
		mockSourceChannel = {
			id: '755579237934694420', // starbunk channel
			name: 'source-channel',
			guild: {
				id: guildIDs.StarbunkCrusaders
			},
			members: new Map([
				['user-id', { displayName: 'Source User', avatarURL: () => 'source-avatar-url' }]
			])
		} as unknown as TextChannel;

		// Set up mock target channel (where message is synced to)
		mockTargetChannel = {
			id: '755585038388691127', // linked snowbunk channel
			name: 'target-channel',
			guild: {
				id: guildIDs.Snowfall
			},
			members: new Map([
				['user-id', { displayName: 'Target User', avatarURL: () => 'target-avatar-url' }]
			]),
			fetchWebhooks: jest.fn().mockResolvedValue(new Map([['webhook-id', mockWebhook]])),
			createWebhook: jest.fn().mockResolvedValue(mockWebhook)
		} as unknown as TextChannel;

		// Set up mock message with required Discord.js properties
		mockMessage = {
			id: 'message-id',
			content: 'Test message content',
			author: {
				id: 'user-id',
				bot: false,
				displayName: 'Author Display Name',
				defaultAvatarURL: 'default-avatar-url'
			},
			channel: mockSourceChannel,
			member: {
				displayName: 'Member Display Name',
				avatarURL: () => 'member-avatar-url'
			},
			// Add required Discord.js internal properties
			_cacheType: 0,
			_patch: jest.fn()
		} as unknown as Message;

		// Set up SnowbunkClient
		client = new SnowbunkClient({
			intents: ['Guilds', 'GuildMessages', 'MessageContent']
		});

		// Reset all mocks
		jest.clearAllMocks();

		// Setup webhook service mock
		(webhookService.getChannelWebhook as jest.Mock) = jest.fn().mockResolvedValue(mockWebhook);
		(webhookService.writeMessage as jest.Mock) = jest.fn().mockImplementation(() => Promise.resolve({ id: 'sent-message-id' }));
	});

	describe('Channel mapping', () => {
		it('should correctly map channels', () => {
			// Test the channel mapping
			const linkedChannels = client.getSyncedChannels(mockSourceChannel.id as string);
			expect(linkedChannels).toContain(mockTargetChannel.id as string);

			// Test bidirectional mapping
			const reverseLinkedChannels = client.getSyncedChannels(mockTargetChannel.id as string);
			expect(reverseLinkedChannels).toContain(mockSourceChannel.id as string);
		});
	});

	describe('Message filtering', () => {
		it('should not sync messages from bots', () => {
			// Set message author as a bot
			const botMessage = {
				...mockMessage,
				author: {
					...mockMessage.author,
					bot: true
				}
			} as Message;

			// Call syncMessage directly
			client.syncMessage(botMessage);

			// Verify no syncing occurred
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should not sync messages from Goose', () => {
			// Set message author as Goose
			const gooseMessage = {
				...mockMessage,
				author: {
					...mockMessage.author,
					id: userID.Goose
				}
			} as Message;

			// Call syncMessage directly
			client.syncMessage(gooseMessage);

			// Verify no syncing occurred
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});
	});

	describe('Message writing', () => {
		it('should use the correct display name and avatar', () => {
			// Call writeMessage directly
			client.writeMessage(mockMessage, mockTargetChannel as TextChannel);

			// Verify the correct display name and avatar were used
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockTargetChannel,
				expect.objectContaining({
					username: 'Target User',
					avatarURL: 'target-avatar-url',
					content: 'Test message content'
				})
			);
		});

		it('should handle webhook service errors', () => {
			// Mock webhook service to throw an error
			(webhookService.writeMessage as jest.Mock).mockImplementation(() => {
				throw new Error('Webhook error');
			});

			// Spy on logger
			const errorSpy = jest.spyOn(Logger, 'error');

			// Call writeMessage directly
			client.writeMessage(mockMessage, mockTargetChannel as TextChannel);

			// Verify error was logged
			expect(errorSpy).toHaveBeenCalledWith(
				expect.stringContaining('Error writing message to channel'),
				expect.any(Error)
			);
		});
	});
});
