// Mocks need to be at the very top, before any imports
import { mockWebhookServiceDefault } from '@/tests/mocks/serviceMocks';
jest.mock('@/webhooks/webhookService', () => mockWebhookServiceDefault());

// Import the model constants
import { AVATAR_URL, BOT_NAME, TEST } from './sheeshBotModel';

// Store original Math.random
const originalRandom = Math.random;

// Mock the PatternCondition to handle "sheesh" patterns
jest.mock('@/starbunk/bots/triggers/conditions/patternCondition', () => {
	return {
		PatternCondition: jest.fn().mockImplementation(() => ({
			shouldTrigger: jest.fn().mockImplementation((message) => {
				// Only trigger on messages containing the word "sheesh" with possible 'e' variations
				if (message && message.content) {
					const sheeshPattern = /\bsh(e)+sh\b/i;
					return Promise.resolve(sheeshPattern.test(message.content));
				}
				return Promise.resolve(false);
			})
		}))
	};
});

// Real imports after all mocks
import { createMockGuildMember, createMockMessage } from '@/tests/mocks/discordMocks';
import webhookService from '@/webhooks/webhookService';
import { Message, TextChannel, User } from 'discord.js';
import ReplyBot from '../../replyBot';
import createSheeshBot from './sheeshBot';

describe('SheeshBot', () => {
	// Test fixtures
	let sheeshBot: ReplyBot;
	let mockMessage: Partial<Message<boolean>>;

	beforeEach(() => {
		// Arrange - Common setup for all tests
		jest.clearAllMocks();

		// Mock Math.random to return a consistent value for testing
		Math.random = jest.fn().mockReturnValue(TEST.RESPONSE.MOCK_RANDOM_VALUE);

		// Create message mock
		mockMessage = createMockMessage(TEST.USER_NAME);
		if (mockMessage.author) {
			Object.defineProperty(mockMessage.author, 'displayName', {
				value: TEST.USER_NAME,
				configurable: true
			});
		}

		// Create bot instance
		sheeshBot = createSheeshBot();
	});

	afterEach(() => {
		// Restore original Math.random
		Math.random = originalRandom;
	});

	describe('identity', () => {
		it('should have correct name and avatar URL', () => {
			// Act
			const identity = sheeshBot.getIdentity();

			// Assert
			expect(identity.name).toBe(BOT_NAME);
			expect(identity.avatarUrl).toBe(AVATAR_URL);
		});
	});

	describe('message handling', () => {
		it('should ignore messages from bots', async () => {
			// Arrange
			mockMessage.author = {
				...createMockGuildMember(TEST.BOT_USER_ID, TEST.BOT_USER_NAME).user,
				bot: true
			} as User;
			mockMessage.content = TEST.MESSAGE.SHEESH;

			// Act
			await sheeshBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "sheesh" with random length sheesh', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.SHEESH;

			// Act
			await sheeshBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: BOT_NAME,
					avatarURL: AVATAR_URL,
					content: TEST.RESPONSE.EXPECTED_SHEESH
				})
			);
		});

		it('should respond to "SHEESH" (case insensitive)', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.SHEESH_UPPERCASE;

			// Act
			await sheeshBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: BOT_NAME,
					avatarURL: AVATAR_URL,
					content: TEST.RESPONSE.EXPECTED_SHEESH
				})
			);
		});

		it('should respond to "sheesh" with varying number of "e"s', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.SHEESH_EXTENDED;

			// Act
			await sheeshBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: BOT_NAME,
					avatarURL: AVATAR_URL,
					content: TEST.RESPONSE.EXPECTED_SHEESH
				})
			);
		});

		it('should respond to "sheesh" in a sentence', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.SHEESH_IN_SENTENCE;

			// Act
			await sheeshBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: BOT_NAME,
					avatarURL: AVATAR_URL,
					content: TEST.RESPONSE.EXPECTED_SHEESH
				})
			);
		});

		it('should NOT respond to unrelated messages', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.UNRELATED;

			// Act
			await sheeshBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
