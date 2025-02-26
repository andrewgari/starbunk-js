import { Message, User } from 'discord.js';
import { createMockGuildMember, createMockMessage } from '../../../__tests__/mocks/discordMocks';
import { createMockWebhookService } from '../../../__tests__/mocks/serviceMocks';
import BotBot from '../../../starbunk/bots/reply-bots/botBot';
import Random from '../../../utils/random';

jest.mock('../../../utils/random');

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
		beforeEach(() => {
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;
		});

		it('should respond to bot messages with 5% chance', async () => {
			// Create a fresh message with bot author
			mockMessage = {
				...createMockMessage('TestUser'),
				content: 'Hello from another bot',
				author: {
					...createMockGuildMember('bot-id', 'BotUser').user,
					bot: true
				} as User
			};

			// Mock the random chance to return true (5% chance hit)
			(Random.percentChance as jest.Mock).mockReturnValue(true);

			// Mock the sendReply method directly
			const sendReplySpy = jest.spyOn(botBot, 'sendReply').mockResolvedValue();

			await botBot.handleMessage(mockMessage as Message<boolean>);

			expect(Random.percentChance).toHaveBeenCalledWith(5);
			expect(sendReplySpy).toHaveBeenCalledWith(
				mockMessage.channel,
				'Hello fellow bot!'
			);
		});

		it('should not respond to human messages', async () => {
			mockMessage.author = { ...mockMessage.author, bot: false } as User;

			// Mock the sendReply method directly
			const sendReplySpy = jest.spyOn(botBot, 'sendReply').mockResolvedValue();

			await botBot.handleMessage(mockMessage as Message<boolean>);
			expect(sendReplySpy).not.toHaveBeenCalled();
		});

		it('should not respond to its own messages', async () => {
			// Set up a message that appears to be from BotBot itself
			mockMessage = {
				...createMockMessage('TestUser'),
				content: 'Hello fellow bot!',
				author: {
					...mockMessage.author,
					bot: true,
					username: 'BotBot'  // Same name as the bot
				} as User
			};

			// Mock the sendReply method directly
			const sendReplySpy = jest.spyOn(botBot, 'sendReply').mockResolvedValue();

			await botBot.handleMessage(mockMessage as Message<boolean>);
			expect(sendReplySpy).not.toHaveBeenCalled();
		});
	});
});
