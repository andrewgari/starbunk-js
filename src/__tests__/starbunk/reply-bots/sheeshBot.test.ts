import { Message, TextChannel, User } from 'discord.js';
import { createMockGuildMember, createMockMessage } from '../../../__tests__/mocks/discordMocks';
import { createMockWebhookService } from '../../../__tests__/mocks/serviceMocks';
import createSheeshBot from '../../../starbunk/bots/reply-bots/sheeshBot';
import ReplyBot from '../../../starbunk/bots/replyBot';
import { patchReplyBot } from '../../helpers/replyBotHelper';

// Mock Math.random to control the random behavior in tests
const originalRandom = Math.random;

describe('SheeshBot', () => {
	let sheeshBot: ReplyBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;

	beforeEach(() => {
		// Mock Math.random to return a consistent value for testing
		Math.random = jest.fn().mockReturnValue(0.5);

		mockWebhookService = createMockWebhookService();
		mockMessage = createMockMessage('TestUser');
		sheeshBot = createSheeshBot(mockWebhookService);
		patchReplyBot(sheeshBot, mockWebhookService);
	});

	afterEach(() => {
		// Restore original Math.random
		Math.random = originalRandom;
	});

	describe('bot configuration', () => {
		it('should have correct name', () => {
			const identity = sheeshBot.getIdentity();
			expect(identity.name).toBe('SheeshBot');
		});

		it('should have correct avatar URL', () => {
			const identity = sheeshBot.getIdentity();
			expect(identity.avatarUrl).toBe('https://i.kym-cdn.com/photos/images/newsfeed/002/297/355/cb3');
		});
	});

	describe('message handling', () => {
		it('should ignore messages from bots', async () => {
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			mockMessage.content = 'sheesh';

			await sheeshBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "sheesh" with random length sheesh', async () => {
			mockMessage.content = 'sheesh';

			// With Math.random mocked to 0.5, we expect 0.5 * 15 + 3 = 10.5 -> 10 'e's
			const expectedSheesh = 'Sheeeeeeeeeesh';

			await sheeshBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'SheeshBot',
					avatarURL: 'https://i.kym-cdn.com/photos/images/newsfeed/002/297/355/cb3',
					content: expectedSheesh
				})
			);
		});

		it('should respond to "SHEESH" (case insensitive)', async () => {
			mockMessage.content = 'SHEESH';

			await sheeshBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'SheeshBot',
					avatarURL: 'https://i.kym-cdn.com/photos/images/newsfeed/002/297/355/cb3'
				})
			);
		});

		it('should respond to "sheesh" with varying number of "e"s', async () => {
			mockMessage.content = 'sheeeeesh';

			await sheeshBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'SheeshBot',
					avatarURL: 'https://i.kym-cdn.com/photos/images/newsfeed/002/297/355/cb3'
				})
			);
		});

		it('should respond to "sheesh" in a sentence', async () => {
			mockMessage.content = 'I said sheesh to that';

			await sheeshBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'SheeshBot',
					avatarURL: 'https://i.kym-cdn.com/photos/images/newsfeed/002/297/355/cb3'
				})
			);
		});

		it('should NOT respond to unrelated messages', async () => {
			mockMessage.content = 'Hello there!';

			await sheeshBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
