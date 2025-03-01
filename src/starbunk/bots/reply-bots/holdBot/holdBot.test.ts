// Mocks need to be at the very top, before any imports
import { mockWebhookServiceDefault } from '@/tests/mocks/serviceMocks';
jest.mock('@/webhooks/webhookService', () => mockWebhookServiceDefault());

// Import the model constants
import { BOT_NAME, HOLD_BOT_AVATAR_URL, TEST } from './holdBotModel';

// Real imports after all mocks
import { createMockGuildMember, createMockMessage } from '@/tests/mocks/discordMocks';
import webhookService from '@/webhooks/webhookService';
import { Message, TextChannel, User } from 'discord.js';
import ReplyBot from '../../replyBot';
import createHoldBot from './holdBot';

describe('HoldBot', () => {
	// Test fixtures
	let holdBot: ReplyBot;
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
		holdBot = createHoldBot();
	});

	describe('identity', () => {
		it('should have correct name and avatar URL', () => {
			// Act
			const identity = holdBot.getIdentity();

			// Assert
			expect(identity.name).toBe(BOT_NAME);
			expect(identity.avatarUrl).toBe(HOLD_BOT_AVATAR_URL);
		});
	});

	describe('message handling', () => {
		it('should ignore messages from bots', async () => {
			// Arrange
			mockMessage.author = {
				...createMockGuildMember(TEST.BOT_USER_ID, TEST.BOT_USER_NAME).user,
				bot: true
			} as User;
			mockMessage.content = TEST.MESSAGE.HOLD;

			// Act
			await holdBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "hold" as a standalone word', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.HOLD;

			// Act
			await holdBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: BOT_NAME,
					avatarURL: HOLD_BOT_AVATAR_URL,
					content: TEST.RESPONSE.DEFAULT
				})
			);
		});

		it('should respond to "HOLD" (case insensitive)', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.HOLD_UPPERCASE;

			// Act
			await holdBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: BOT_NAME,
					avatarURL: HOLD_BOT_AVATAR_URL,
					content: TEST.RESPONSE.DEFAULT
				})
			);
		});

		it('should respond to "hold" in a sentence', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.HOLD_IN_SENTENCE;

			// Act
			await holdBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: BOT_NAME,
					avatarURL: HOLD_BOT_AVATAR_URL,
					content: TEST.RESPONSE.DEFAULT
				})
			);
		});

		it('should NOT respond to words containing "hold" as a substring', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.HOLD_AS_SUBSTRING;

			// Act
			await holdBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should NOT respond to unrelated messages', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.UNRELATED;

			// Act
			await holdBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
