// Mocks need to be at the very top, before any imports
import { mockWebhookServiceDefault } from '@/tests/mocks/serviceMocks';
jest.mock('@/webhooks/webhookService', () => mockWebhookServiceDefault());

// Import the model constants
import { EZIO_BOT_AVATAR_URL, EZIO_BOT_NAME, TEST } from './ezioBotModel';

// Real imports after all mocks
import { createMockGuildMember, createMockMessage } from '@/tests/mocks/discordMocks';
import webhookService from '@/webhooks/webhookService';
import { Message, TextChannel, User } from 'discord.js';
import ReplyBot from '../../replyBot';
import createEzioBot from './ezioBot';

describe('EzioBot', () => {
	// Test fixtures
	let ezioBot: ReplyBot;
	let mockMessage: Partial<Message<boolean>>;

	beforeEach(() => {
		// Arrange - Common setup for all tests
		jest.clearAllMocks();

		// Create message mock
		mockMessage = createMockMessage(TEST.USER_NAME);
		if (mockMessage.author) {
			Object.defineProperty(mockMessage.author, 'displayName', {
				value: TEST.USER_NAME,
				configurable: true
			});
		}

		// Create bot instance
		ezioBot = createEzioBot(webhookService);
	});

	describe('identity', () => {
		it('should have correct name and avatar URL', () => {
			// Act
			const identity = ezioBot.getIdentity();

			// Assert
			expect(identity.name).toBe(EZIO_BOT_NAME);
			expect(identity.avatarUrl).toBe(EZIO_BOT_AVATAR_URL);
		});
	});

	describe('message handling', () => {
		it('should ignore messages from bots', async () => {
			// Arrange
			mockMessage.author = {
				...createMockGuildMember(TEST.BOT_USER_ID, TEST.BOT_USER_NAME).user,
				bot: true
			} as User;
			mockMessage.content = TEST.MESSAGE.WITH_EZIO;

			// Act
			await ezioBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "ezio"', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.WITH_EZIO;

			// Act
			await ezioBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: EZIO_BOT_NAME,
					avatarURL: EZIO_BOT_AVATAR_URL,
					content: `Remember ${TEST.USER_NAME}, Nothing is true; Everything is permitted.`
				})
			);
		});

		it('should respond to "assassin"', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.WITH_ASSASSIN;

			// Act
			await ezioBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: EZIO_BOT_NAME,
					avatarURL: EZIO_BOT_AVATAR_URL,
					content: `Remember ${TEST.USER_NAME}, Nothing is true; Everything is permitted.`
				})
			);
		});

		it('should respond to "assassins creed"', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.WITH_ASSASSINS_CREED;

			// Act
			await ezioBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: EZIO_BOT_NAME,
					avatarURL: EZIO_BOT_AVATAR_URL,
					content: `Remember ${TEST.USER_NAME}, Nothing is true; Everything is permitted.`
				})
			);
		});

		it('should NOT respond to unrelated messages', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.UNRELATED;

			// Act
			await ezioBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
