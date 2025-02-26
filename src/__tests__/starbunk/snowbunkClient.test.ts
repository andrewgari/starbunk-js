import userID from '@/discord/userID';
import SnowbunkClient from '@/snowbunk/snowbunkClient';
import webhookService from '@/webhooks/webhookService';
import { Events, Message, TextChannel } from 'discord.js';

jest.mock('@/webhooks/webhookService');

describe('SnowbunkClient', () => {
	let client: SnowbunkClient;
	let mockMessage: Partial<Message>;
	let mockChannel: Partial<TextChannel>;

	beforeEach(() => {
		client = new SnowbunkClient({
			intents: ['Guilds', 'GuildMessages', 'MessageContent']
		});
		(client as unknown as { emit: jest.Mock }).emit = jest.fn();

		mockChannel = {
			id: '757866614787014660',
			members: new Map([
				['user-id', { displayName: 'Test User', avatarURL: () => 'avatar-url' }]
			])
		} as unknown as TextChannel;

		mockMessage = {
			content: 'test message',
			author: {
				id: 'user-id',
				bot: false,
				displayName: 'Test User',
				defaultAvatarURL: 'default-avatar'
			},
			channel: mockChannel,
			member: undefined
		} as unknown as Message;

		// Reset all mocks
		jest.clearAllMocks();

		// Setup webhook mock
		(webhookService.writeMessage as jest.Mock).mockImplementation(() => Promise.resolve());

		// Setup channel fetch mock
		(client.channels.fetch as jest.Mock) = jest.fn().mockResolvedValue(mockChannel);
	});

	describe('channel syncing', () => {
		it('should get synced channels', () => {
			const channels = client.getSyncedChannels('757866614787014660');
			expect(channels).toContain('856617421942030364');
			expect(channels).toContain('798613445301633137');
		});

		it('should return empty array for unknown channel', () => {
			const channels = client.getSyncedChannels('unknown');
			expect(channels).toHaveLength(0);
		});
	});

	describe('message handling', () => {
		it('should ignore messages from Goose', () => {
			mockMessage.author = { id: userID.Goose } as unknown as Message['author'];
			client.syncMessage(mockMessage as Message);
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should ignore bot messages', () => {
			mockMessage.author = { bot: true } as unknown as Message['author'];
			client.syncMessage(mockMessage as Message);
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should sync messages to linked channels', async () => {
			// Mock implementation for channels.fetch that immediately calls writeMessage
			(client.channels.fetch as jest.Mock).mockImplementation(() => {
				// Return a resolved promise with the mock channel
				const promise = Promise.resolve(mockChannel);

				// Ensure writeMessage gets called by manually invoking the chain
				promise.then(() => {
					client.writeMessage(mockMessage as Message, mockChannel as TextChannel);
				});

				return promise;
			});

			client.syncMessage(mockMessage as Message);

			// Flush promises
			await Promise.resolve();
			await Promise.resolve();

			expect(client.channels.fetch).toHaveBeenCalledWith('856617421942030364');
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					username: 'Test User',
					content: 'test message'
				})
			);
		});
	});

	describe('bootstrap', () => {
		it('should set up message event handler', () => {
			client.bootstrap();
			expect(client.listenerCount(Events.MessageCreate)).toBe(1);
		});
	});

	describe('writeMessage', () => {
		it('should use member display name if available', () => {
			client.writeMessage(mockMessage as Message, mockChannel as TextChannel);
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					username: 'Test User'
				})
			);
		});

		it('should fallback to author display name', () => {
			const testMessage = {
				...mockMessage,
				member: undefined
			} as unknown as Message;
			client.writeMessage(testMessage, mockChannel as TextChannel);
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					username: 'Test User'
				})
			);
		});
	});
});
