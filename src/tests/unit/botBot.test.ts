import BotBot from '@/starbunk/bots/reply-bots/botBot';
import { createMockGuildMember, createMockMessage } from '@/tests/mocks/discordMocks';
import { createMockWebhookService } from '@/tests/mocks/serviceMocks';
import Random from '@/utils/random';
import { Message, User } from 'discord.js';

jest.mock('@/utils/random');

describe('BotBot', () => {
	let botBot: BotBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;

	beforeEach(() => {
		mockWebhookService = createMockWebhookService();
		mockMessage = createMockMessage('TestUser');
		botBot = new BotBot(mockWebhookService);
		jest.clearAllMocks();
	});

	describe('bot configuration', () => {
		it('should have correct name', () => {
			expect(botBot.getBotName()).toBe('BotBot');
		});

		it('should have correct avatar URL', () => {
			expect(botBot.getAvatarUrl()).toBe('https://cdn-icons-png.flaticon.com/512/4944/4944377.png');
		});
	});

	describe('message handling', () => {
		const expectedMessageOptions = {
			username: 'BotBot',
			avatarURL: 'https://cdn-icons-png.flaticon.com/512/4944/4944377.png',
			content: 'Hello fellow bot!',
			embeds: []
		};

		beforeEach(() => {
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;
		});

		it('should respond to bot messages', () => {
			mockMessage = {
				...mockMessage,
				content: 'Hello fellow bot!',
				author: { ...mockMessage.author, bot: true } as User
			};
			botBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expectedMessageOptions
			);
		});

		it('should not respond to human messages', () => {
			mockMessage.author = { ...mockMessage.author, bot: false } as User;
			botBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});
	});

	describe('random message handling', () => {
		const expectedMessageOptions = {
			username: 'BotBot',
			avatarURL: 'https://cdn-icons-png.flaticon.com/512/4944/4944377.png',
			content: 'Hello fellow bot!',
			embeds: []
		};

		beforeEach(() => {
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;
		});

		it('should respond to bot messages with 10% chance', () => {
			(Random.percentChance as jest.Mock).mockReturnValue(true);
			botBot.handleRandomMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expectedMessageOptions
			);
		});

		it('should not respond to bot messages with 90% chance', () => {
			(Random.percentChance as jest.Mock).mockReturnValue(false);
			botBot.handleRandomMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should not respond to human messages', () => {
			mockMessage.author = { ...mockMessage.author, bot: false } as User;
			botBot.handleRandomMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
