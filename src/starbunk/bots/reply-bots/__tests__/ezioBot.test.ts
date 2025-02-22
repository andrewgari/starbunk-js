import { createMockGuildMember, createMockMessage } from '@/test/mocks/discordMocks';
import { createMockWebhookService } from '@/test/mocks/serviceMocks';
import { Message, User } from 'discord.js';
import EzioBot from '../ezioBot';

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
		const getExpectedMessageOptions = (username: string): {
			username: string;
			avatarURL: string;
			content: string;
			embeds: never[];
		} => ({
			username: 'Ezio Auditore Da Firenze',
			avatarURL: 'https://www.creativeuncut.com/gallery-12/art/ac2-ezio5.jpg',
			content: `Remember ${username}, Nothing is true; Everything is permitted.`,
			embeds: []
		});

		it('should ignore messages from bots', () => {
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			ezioBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "ezio"', () => {
			mockMessage.content = 'ezio';
			ezioBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				getExpectedMessageOptions('TestUser')
			);
		});

		it('should respond to "assassin"', () => {
			mockMessage.content = 'assassin';
			ezioBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				getExpectedMessageOptions('TestUser')
			);
		});

		it('should respond to "hassassin"', () => {
			mockMessage.content = 'hassassin';
			ezioBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				getExpectedMessageOptions('TestUser')
			);
		});

		it('should respond to case variations', () => {
			mockMessage.content = 'EZIO';
			ezioBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				getExpectedMessageOptions('TestUser')
			);
		});

		it('should not respond to unrelated messages', () => {
			mockMessage.content = 'hello world';
			ezioBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
