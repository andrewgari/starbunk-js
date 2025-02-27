import { Message, TextChannel, User } from 'discord.js';
import createBotBot from '../../../starbunk/bots/reply-bots/botBot';
import ReplyBot from '../../../starbunk/bots/replyBot';
import { RandomChanceCondition } from '../../../starbunk/bots/triggers/conditions/randomChanceCondition';
import { patchReplyBot } from '../../helpers/replyBotHelper';
import { createMockGuildMember, createMockMessage } from '../../mocks/discordMocks';
import { createMockWebhookService } from '../../mocks/serviceMocks';

// Mock the RandomChanceCondition to control the random behavior in tests
jest.mock('../../../starbunk/bots/triggers/conditions/randomChanceCondition');

describe('BotBot', () => {
	let botBot: ReplyBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;
	let mockRandomChanceCondition: jest.MockedClass<typeof RandomChanceCondition>;

	beforeEach(() => {
		// Reset mocks
		jest.clearAllMocks();

		// Setup mock for RandomChanceCondition
		mockRandomChanceCondition = RandomChanceCondition as jest.MockedClass<typeof RandomChanceCondition>;
		mockRandomChanceCondition.prototype.shouldTrigger = jest.fn();

		mockWebhookService = createMockWebhookService();
		mockMessage = createMockMessage('TestUser');
		botBot = createBotBot(mockWebhookService);
		patchReplyBot(botBot, mockWebhookService);
	});

	describe('bot configuration', () => {
		it('should have correct name', () => {
			const identity = botBot.getIdentity();
			expect(identity.name).toBe('BotBot');
		});

		it('should have correct avatar URL', () => {
			const identity = botBot.getIdentity();
			expect(identity.avatarUrl).toBe('https://preview.redd.it/md0lzbvuc3571.png?width=1920&format=png&auto=webp&s=ff403a8d4b514af8d99792a275d2c066b8d1a4de');
		});
	});

	describe('message handling', () => {
		it('should ignore messages from bots', async () => {
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			mockMessage.content = 'bot';

			await botBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "bot" when random chance is met', async () => {
			// Set the random chance condition to trigger
			mockRandomChanceCondition.prototype.shouldTrigger.mockResolvedValue(true);

			mockMessage.content = 'bot';

			await botBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'BotBot',
					avatarURL: 'https://preview.redd.it/md0lzbvuc3571.png?width=1920&format=png&auto=webp&s=ff403a8d4b514af8d99792a275d2c066b8d1a4de',
					content: "Why hello there, fellow bot 🤖"
				})
			);
		});

		it('should NOT respond to "bot" when random chance is not met', async () => {
			// Set the random chance condition to NOT trigger
			mockRandomChanceCondition.prototype.shouldTrigger.mockResolvedValue(false);

			mockMessage.content = 'bot';

			await botBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to bot messages when random chance condition is true', async () => {
			// Setup a bot message
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			mockMessage.content = 'Hello there';

			// Make the random chance condition return true
			mockRandomChanceCondition.prototype.shouldTrigger.mockResolvedValue(true);

			await botBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'BotBot',
					avatarURL: 'https://preview.redd.it/md0lzbvuc3571.png?width=1920&format=png&auto=webp&s=ff403a8d4b514af8d99792a275d2c066b8d1a4de',
					content: "Why hello there, fellow bot 🤖"
				})
			);
		});

		it('should NOT respond to bot messages when random chance condition is false', async () => {
			// Setup a bot message
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			mockMessage.content = 'Hello there';

			// Make the random chance condition return false
			mockRandomChanceCondition.prototype.shouldTrigger.mockResolvedValue(false);

			await botBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
