// Mocks need to be at the very top, before any imports
import { mockWebhookServiceDefault } from '@/tests/mocks/serviceMocks';
jest.mock('@/webhooks/webhookService', () => mockWebhookServiceDefault());

// Import the model constants
import { CHECK_BOT_AVATAR_URL, CHECK_RESPONSE, CZECH_RESPONSE, TEST } from './checkBotModel';

// Real imports after all mocks
import { createMockGuildMember, createMockMessage } from '@/tests/mocks/discordMocks';
import webhookService from '@/webhooks/webhookService';
import { Message, TextChannel, User } from 'discord.js';
import ReplyBot from '../../replyBot';
import createCheckBot from './checkBot';

describe('CheckBot', () => {
	// Test fixtures
	let checkBot: ReplyBot;
	let mockMessage: Partial<Message<boolean>>;

	beforeEach(() => {
		// Arrange - Common setup for all tests
		jest.clearAllMocks();
		mockMessage = createMockMessage(TEST.USER_NAME);

		if (mockMessage.author) {
			Object.defineProperty(mockMessage.author, 'displayName', {
				value: TEST.USER_NAME,
				configurable: true
			});
		}

		checkBot = createCheckBot();
	});

	describe('identity', () => {
		it('should have correct name and avatar URL', () => {
			// Act
			const identity = checkBot.getIdentity();

			// Assert
			expect(identity.name).toBe('CheckBot');
			expect(identity.avatarUrl).toBe(CHECK_BOT_AVATAR_URL);
		});
	});

	describe('message handling', () => {
		it('should ignore messages from bots', async () => {
			// Arrange
			mockMessage.author = {
				...createMockGuildMember(TEST.BOT_USER_ID, TEST.BOT_USER_NAME).user,
				bot: true
			} as User;
			mockMessage.content = TEST.MESSAGE.CZECH;

			// Act
			await checkBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "czech" with correction to "check"', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.CZECH;

			// Act
			await checkBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'CheckBot',
					avatarURL: CHECK_BOT_AVATAR_URL,
					content: CHECK_RESPONSE
				})
			);
		});

		it('should respond to "czech" in a sentence', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.CZECH_IN_SENTENCE;

			// Act
			await checkBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'CheckBot',
					avatarURL: CHECK_BOT_AVATAR_URL,
					content: CHECK_RESPONSE
				})
			);
		});

		it('should respond to "check" with correction to "czech"', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.CHECK;

			// Act
			await checkBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'CheckBot',
					avatarURL: CHECK_BOT_AVATAR_URL,
					content: CZECH_RESPONSE
				})
			);
		});

		it('should respond to "check" in a sentence', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.CHECK_IN_SENTENCE;

			// Act
			await checkBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'CheckBot',
					avatarURL: CHECK_BOT_AVATAR_URL,
					content: CZECH_RESPONSE
				})
			);
		});

		it('should NOT respond to unrelated messages', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.UNRELATED;

			// Act
			await checkBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
