import SpiderBot from '@/starbunk/bots/reply-bots/spiderBot';
import { createMockGuildMember, createMockMessage } from '@/tests/mocks/discordMocks';
import { createMockWebhookService } from '@/tests/mocks/serviceMocks';
import { Message, User } from 'discord.js';

describe('SpiderBot', () => {
	let spiderBot: SpiderBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;

	beforeEach(() => {
		mockWebhookService = createMockWebhookService();
		mockMessage = createMockMessage('TestUser');
		spiderBot = new SpiderBot(mockWebhookService);
	});

	describe('bot configuration', () => {
		it('should have correct name', () => {
			expect(spiderBot.getBotName()).toBe('Spider-Bot');
		});

		it('should have correct avatar URL', () => {
			expect(spiderBot.getAvatarUrl()).toBe('https://i.pinimg.com/736x/33/e0/06/33e00653eb485455ce5121b413b26d3b.jpg');
		});
	});

	describe('message handling', () => {
		const expectedMessageOptions = {
			username: 'Spider-Bot',
			avatarURL: 'https://i.pinimg.com/736x/33/e0/06/33e00653eb485455ce5121b413b26d3b.jpg',
			content: "Hey, it's \"**Spider-Man**\"! Don't forget the hyphen! Not Spiderman, that's dumb",
			embeds: []
		};

		it('should ignore messages from bots', () => {
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			spiderBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "spiderman"', () => {
			mockMessage.content = 'spiderman';
			spiderBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expectedMessageOptions
			);
		});

		it('should respond to "spider man"', () => {
			mockMessage.content = 'spider man';
			spiderBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expectedMessageOptions
			);
		});

		it('should not respond to unrelated messages', () => {
			mockMessage.content = 'hello world';
			spiderBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
