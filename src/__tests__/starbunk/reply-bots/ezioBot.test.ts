import { Message, TextChannel, User } from 'discord.js';
import { createMockGuildMember, createMockMessage } from '../../../__tests__/mocks/discordMocks';
import { createMockWebhookService } from '../../../__tests__/mocks/serviceMocks';
import EzioBot from '../../../starbunk/bots/reply-bots/ezioBot';
import { patchReplyBot } from '../../helpers/replyBotHelper';

describe('EzioBot', () => {
	let ezioBot: EzioBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;

	beforeEach(() => {
		mockWebhookService = createMockWebhookService();
		mockMessage = createMockMessage('TestUser');
		ezioBot = new EzioBot(mockWebhookService);
		patchReplyBot(ezioBot, mockWebhookService);
	});

	describe('bot configuration', () => {
		it('should have correct name', () => {
			expect(ezioBot.botName).toBe('Ezio Auditore Da Firenze');
		});

		it('should have correct avatar URL', () => {
			expect(ezioBot.avatarUrl).toBe('https://www.creativeuncut.com/gallery-12/art/ac2-ezio5.jpg');
		});
	});

	describe('message handling', () => {
		const expectedResponse = (username: string): string =>
			`Remember ${username}, Nothing is true; Everything is permitted.`;

		const expectedMessageOptions = {
			username: 'Ezio Auditore Da Firenze',
			avatarURL: 'https://www.creativeuncut.com/gallery-12/art/ac2-ezio5.jpg',
			content: expectedResponse('TestUser'),
			embeds: []
		};

		it('should ignore messages from bots', async () => {
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;

			await ezioBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "ezio"', async () => {
			mockMessage.content = 'ezio';

			await ezioBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expectedMessageOptions
			);
		});

		it('should respond to "assassin"', async () => {
			mockMessage.content = 'assassin';

			await ezioBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expectedMessageOptions
			);
		});

		it('should respond to "hassassin"', async () => {
			mockMessage.content = 'hassassin';

			await ezioBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expectedMessageOptions
			);
		});

		it('should respond to case variations', async () => {
			mockMessage.content = 'EZIO';

			await ezioBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expectedMessageOptions
			);
		});

		it('should not respond to unrelated messages', async () => {
			mockMessage.content = 'hello world';

			await ezioBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
