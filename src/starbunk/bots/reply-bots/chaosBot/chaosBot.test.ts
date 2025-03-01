// Mocks need to be at the very top, before any imports
import { mockWebhookServiceDefault } from '@/tests/mocks/serviceMocks';
jest.mock('@/webhooks/webhookService', () => mockWebhookServiceDefault());

// Import the model constants
import { AVATAR_URL, BOT_NAME, CHAOS_RESPONSE, TEST } from './chaosBotModel';

// Mock the PatternCondition to handle "chaos" patterns
jest.mock('@/starbunk/bots/triggers/conditions/patternCondition', () => {
	return {
		PatternCondition: jest.fn().mockImplementation(() => ({
			shouldTrigger: jest.fn().mockImplementation((message) => {
				// Only trigger on messages containing the word "chaos" as a standalone word
				if (message && message.content) {
					const chaosPattern = /\bchaos\b/i;
					return Promise.resolve(chaosPattern.test(message.content));
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
import createChaosBot from './chaosBot';

describe('ChaosBot', () => {
	// Test fixtures
	let chaosBot: ReplyBot;
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
		chaosBot = createChaosBot();
	});

	describe('identity', () => {
		it('should have correct name and avatar URL', () => {
			// Act
			const identity = chaosBot.getIdentity();

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
			mockMessage.content = TEST.MESSAGE.CHAOS;

			// Act
			await chaosBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "chaos" as a standalone word', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.CHAOS;

			// Act
			await chaosBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: BOT_NAME,
					avatarURL: AVATAR_URL,
					content: CHAOS_RESPONSE
				})
			);
		});

		it('should respond to "CHAOS" (case insensitive)', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.CHAOS_UPPERCASE;

			// Act
			await chaosBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: BOT_NAME,
					avatarURL: AVATAR_URL,
					content: CHAOS_RESPONSE
				})
			);
		});

		it('should respond to "chaos" in a sentence', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.CHAOS_IN_SENTENCE;

			// Act
			await chaosBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: BOT_NAME,
					avatarURL: AVATAR_URL,
					content: CHAOS_RESPONSE
				})
			);
		});

		it('should NOT respond to words containing "chaos" as a substring', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.CHAOS_AS_SUBSTRING;

			// Act
			await chaosBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should NOT respond to unrelated messages', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.UNRELATED;

			// Act
			await chaosBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
