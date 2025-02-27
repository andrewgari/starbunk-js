import { Message, TextChannel, User } from 'discord.js';
import { createMockGuildMember, createMockMessage } from '../../../__tests__/mocks/discordMocks';
import { createMockWebhookService } from '../../../__tests__/mocks/serviceMocks';
import createEzioBot from '../../../starbunk/bots/reply-bots/ezioBot';
import ReplyBot from '../../../starbunk/bots/replyBot';
import { patchReplyBot } from '../../helpers/replyBotHelper';

describe('EzioBot', () => {
	let ezioBot: ReplyBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;

	beforeEach(() => {
		mockWebhookService = createMockWebhookService();
		mockMessage = createMockMessage('TestUser');
		// Ensure the author has a displayName
		if (mockMessage.author) {
			Object.defineProperty(mockMessage.author, 'displayName', {
				value: 'TestUser',
				configurable: true
			});
		}
		ezioBot = createEzioBot(mockWebhookService);
		patchReplyBot(ezioBot, mockWebhookService);
	});

	describe('bot configuration', () => {
		it('should have correct name', () => {
			const identity = ezioBot.getIdentity();
			expect(identity.name).toBe('Ezio Auditore Da Firenze');
		});

		it('should have correct avatar URL', () => {
			const identity = ezioBot.getIdentity();
			expect(identity.avatarUrl).toBe('https://www.creativeuncut.com/gallery-12/art/ac2-ezio5.jpg');
		});
	});

	describe('message handling', () => {
		it('should ignore messages from bots', async () => {
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			Object.defineProperty(mockMessage.author, 'displayName', {
				value: 'BotUser',
				configurable: true
			});
			mockMessage.content = 'ezio';

			await ezioBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "ezio"', async () => {
			mockMessage.content = 'ezio';

			await ezioBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'Ezio Auditore Da Firenze',
					avatarURL: 'https://www.creativeuncut.com/gallery-12/art/ac2-ezio5.jpg',
					content: 'Remember TestUser, Nothing is true; Everything is permitted.'
				})
			);
		});

		it('should respond to "assassin"', async () => {
			mockMessage.content = 'assassin';

			await ezioBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'Ezio Auditore Da Firenze',
					avatarURL: 'https://www.creativeuncut.com/gallery-12/art/ac2-ezio5.jpg',
					content: 'Remember TestUser, Nothing is true; Everything is permitted.'
				})
			);
		});

		it('should respond to "assassins creed"', async () => {
			mockMessage.content = 'I love assassins creed';

			await ezioBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'Ezio Auditore Da Firenze',
					avatarURL: 'https://www.creativeuncut.com/gallery-12/art/ac2-ezio5.jpg',
					content: 'Remember TestUser, Nothing is true; Everything is permitted.'
				})
			);
		});

		it('should NOT respond to unrelated messages', async () => {
			mockMessage.content = 'Hello there!';

			await ezioBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
