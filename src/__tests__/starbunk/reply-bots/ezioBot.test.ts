import { Message, User } from 'discord.js';
import { createMockGuildMember, createMockMessage } from '../../../__tests__/mocks/discordMocks';
import { createMockWebhookService } from '../../../__tests__/mocks/serviceMocks';
import EzioBot from '../../../starbunk/bots/reply-bots/ezioBot';

describe('EzioBot', () => {
	let ezioBot: EzioBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;

	beforeEach(() => {
		mockWebhookService = createMockWebhookService();
		mockMessage = createMockMessage('TestUser');
		ezioBot = new EzioBot(mockWebhookService);
	});

	describe('bot configuration', () => {
		it('should have correct name', () => {
			expect(ezioBot.getBotName()).toBe('Ezio Auditore Da Firenze');
		});

		it('should have correct avatar URL', () => {
			expect(ezioBot.getAvatarUrl()).toBe('https://www.creativeuncut.com/gallery-12/art/ac2-ezio5.jpg');
		});
	});

	describe('message handling', () => {
		const expectedResponse = (username: string): string =>
			`Remember ${username}, Nothing is true; Everything is permitted.`;

		it('should ignore messages from bots', async () => {
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;

			const sendReplySpy = jest.spyOn(ezioBot, 'sendReply').mockResolvedValue();

			await ezioBot.handleMessage(mockMessage as Message<boolean>);
			expect(sendReplySpy).not.toHaveBeenCalled();
		});

		it('should respond to "ezio"', async () => {
			mockMessage.content = 'ezio';

			const sendReplySpy = jest.spyOn(ezioBot, 'sendReply').mockResolvedValue();

			await ezioBot.handleMessage(mockMessage as Message<boolean>);
			expect(sendReplySpy).toHaveBeenCalledWith(
				mockMessage.channel,
				expectedResponse('TestUser')
			);
		});

		it('should respond to "assassin"', async () => {
			mockMessage.content = 'assassin';

			const sendReplySpy = jest.spyOn(ezioBot, 'sendReply').mockResolvedValue();

			await ezioBot.handleMessage(mockMessage as Message<boolean>);
			expect(sendReplySpy).toHaveBeenCalledWith(
				mockMessage.channel,
				expectedResponse('TestUser')
			);
		});

		it('should respond to "hassassin"', async () => {
			mockMessage.content = 'hassassin';

			const sendReplySpy = jest.spyOn(ezioBot, 'sendReply').mockResolvedValue();

			await ezioBot.handleMessage(mockMessage as Message<boolean>);
			expect(sendReplySpy).toHaveBeenCalledWith(
				mockMessage.channel,
				expectedResponse('TestUser')
			);
		});

		it('should respond to case variations', async () => {
			mockMessage.content = 'EZIO';

			const sendReplySpy = jest.spyOn(ezioBot, 'sendReply').mockResolvedValue();

			await ezioBot.handleMessage(mockMessage as Message<boolean>);
			expect(sendReplySpy).toHaveBeenCalledWith(
				mockMessage.channel,
				expectedResponse('TestUser')
			);
		});

		it('should not respond to unrelated messages', async () => {
			mockMessage.content = 'hello world';

			const sendReplySpy = jest.spyOn(ezioBot, 'sendReply').mockResolvedValue();

			await ezioBot.handleMessage(mockMessage as Message<boolean>);
			expect(sendReplySpy).not.toHaveBeenCalled();
		});
	});
});
