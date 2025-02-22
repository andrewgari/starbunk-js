import GundamBot from '@/starbunk/bots/reply-bots/gundamBot';
import { createMockGuildMember, createMockMessage } from '@/tests/mocks/discordMocks';
import { createMockWebhookService } from '@/tests/mocks/serviceMocks';
import { Message, User } from 'discord.js';

describe('GundamBot', () => {
	let gundamBot: GundamBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;

	beforeEach(() => {
		mockWebhookService = createMockWebhookService();
		mockMessage = createMockMessage('TestUser');
		gundamBot = new GundamBot(mockWebhookService);
	});

	describe('bot configuration', () => {
		it('should have correct name', () => {
			expect(gundamBot.getBotName()).toBe('GundamBot');
		});

		it('should have correct avatar URL', () => {
			expect(gundamBot.getAvatarUrl()).toBe('https://a1.cdn.japantravel.com/photo/41317-179698/1440x960!/tokyo-unicorn-gundam-statue-in-odaiba-179698.jpg');
		});
	});

	describe('message handling', () => {
		const expectedMessageOptions = {
			username: 'GundamBot',
			avatarURL: 'https://a1.cdn.japantravel.com/photo/41317-179698/1440x960!/tokyo-unicorn-gundam-statue-in-odaiba-179698.jpg',
			content: 'That\'s the famous Unicorn Robot, "Gandum". There, I said it.',
			embeds: []
		};

		it('should ignore messages from bots', () => {
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			gundamBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "gundam"', () => {
			mockMessage.content = 'gundam';
			gundamBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expectedMessageOptions
			);
		});

		it('should respond to "gandam"', () => {
			mockMessage.content = 'gandam';
			gundamBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expectedMessageOptions
			);
		});

		it('should respond to case variations', () => {
			mockMessage.content = 'GUNDAM';
			gundamBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expectedMessageOptions
			);
		});

		it('should respond to word within text', () => {
			mockMessage.content = 'look at that gundam over there';
			gundamBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expectedMessageOptions
			);
		});

		it('should not respond to partial matches', () => {
			mockMessage.content = 'gundamium';
			gundamBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should not respond to unrelated messages', () => {
			mockMessage.content = 'hello world';
			gundamBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
