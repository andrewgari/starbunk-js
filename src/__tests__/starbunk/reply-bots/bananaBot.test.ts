import { Message, TextChannel, User } from 'discord.js';
import { createMockGuildMember, createMockMessage } from '../../../__tests__/mocks/discordMocks';
import { createMockWebhookService } from '../../../__tests__/mocks/serviceMocks';
import userID from '../../../discord/userID';
import createBananaBot from '../../../starbunk/bots/reply-bots/bananaBot';
import ReplyBot from '../../../starbunk/bots/replyBot';
import { patchReplyBot } from '../../helpers/replyBotHelper';

// Mock the random utility
jest.mock('../../../utils/random', () => ({
	roll: jest.fn(),
	percentChance: jest.fn()
}));

// Import the mocked random utility
import random from '../../../utils/random';

describe('BananaBot', () => {
	let bananaBot: ReplyBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;

	beforeEach(() => {
		// Reset mocks before each test
		jest.clearAllMocks();

		// Default mock implementation for percentChance (returns false by default)
		(random.percentChance as jest.Mock).mockReturnValue(false);

		mockWebhookService = createMockWebhookService();
		mockMessage = createMockMessage('TestUser');
		// Ensure the author has a displayName and avatar URL
		if (mockMessage.author) {
			Object.defineProperty(mockMessage.author, 'displayName', {
				value: 'TestUser',
				configurable: true
			});
			mockMessage.author.displayAvatarURL = jest.fn().mockReturnValue('https://example.com/avatar.jpg');
		}
		bananaBot = createBananaBot(mockWebhookService);
		patchReplyBot(bananaBot, mockWebhookService);
	});

	describe('bot configuration', () => {
		it('should have correct initial name', () => {
			const identity = bananaBot.getIdentity();
			expect(identity.name).toBe('BananaBot');
		});

		it('should have empty initial avatar URL', () => {
			const identity = bananaBot.getIdentity();
			expect(identity.avatarUrl).toBe('');
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
			mockMessage.author.displayAvatarURL = jest.fn().mockReturnValue('https://example.com/bot-avatar.jpg');
			mockMessage.content = 'banana';

			await bananaBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "banana" with a random response and mimic the user identity', async () => {
			mockMessage.content = 'banana';

			await bananaBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'TestUser',
					avatarURL: 'https://example.com/avatar.jpg',
					content: expect.any(String)
				})
			);
		});

		it('should respond to "banana" in a sentence', async () => {
			mockMessage.content = 'I love banana splits';

			await bananaBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'TestUser',
					avatarURL: 'https://example.com/avatar.jpg',
					content: expect.any(String)
				})
			);
		});

		it('should respond to Venn with 5% random chance', async () => {
			// Set the mock to return true for percentChance
			(random.percentChance as jest.Mock).mockReturnValue(true);

			// Create a message from Venn
			const vennMember = createMockGuildMember(userID.Venn, 'Venn');
			mockMessage.author = vennMember.user as User;
			Object.defineProperty(mockMessage.author, 'displayName', {
				value: 'Venn',
				configurable: true
			});
			mockMessage.author.displayAvatarURL = jest.fn().mockReturnValue('https://example.com/venn-avatar.jpg');
			mockMessage.content = 'This is a message with no banana mention';

			await bananaBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'Venn',
					avatarURL: 'https://example.com/venn-avatar.jpg',
					content: expect.any(String)
				})
			);
		});

		it('should NOT respond to Venn when random chance is above 5%', async () => {
			// Set the mock to return false for percentChance
			(random.percentChance as jest.Mock).mockReturnValue(false);

			// Create a message from Venn
			const vennMember = createMockGuildMember(userID.Venn, 'Venn');
			mockMessage.author = vennMember.user as User;
			Object.defineProperty(mockMessage.author, 'displayName', {
				value: 'Venn',
				configurable: true
			});
			mockMessage.author.displayAvatarURL = jest.fn().mockReturnValue('https://example.com/vennavatar.jpg');
			mockMessage.content = 'This is a message with no bnnb mention';

			await bananaBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should NOT respond to non-Venn users with unrelated messages', async () => {
			// Set the mock to return false for percentChance
			(random.percentChance as jest.Mock).mockReturnValue(false);

			mockMessage.content = 'This is a random message with no bnnb mention';

			await bananaBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
