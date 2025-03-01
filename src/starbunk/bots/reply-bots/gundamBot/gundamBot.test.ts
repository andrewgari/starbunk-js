// Mocks need to be at the very top, before any imports
import { mockWebhookServiceDefault } from '@/tests/mocks/serviceMocks';
jest.mock('@/webhooks/webhookService', () => mockWebhookServiceDefault());

// Import the model constants
import { AVATAR_URL, BOT_NAME, GUNDAM_RESPONSE, TEST } from './gundamBotModel';

// Create variable to control mock behavior
let patternShouldTriggerResponse = TEST.CONDITIONS.TRIGGER;

// Mock the PatternCondition to control when patterns match
jest.mock('@/starbunk/bots/triggers/conditions/patternCondition', () => {
	return {
		PatternCondition: jest.fn().mockImplementation(() => ({
			shouldTrigger: jest.fn().mockImplementation(() => Promise.resolve(patternShouldTriggerResponse))
		}))
	};
});

// Real imports after all mocks
import { createMockGuildMember, createMockMessage } from '@/tests/mocks/discordMocks';
import webhookService from '@/webhooks/webhookService';
import { Message, TextChannel, User } from 'discord.js';
import ReplyBot from '../../replyBot';
import createGundamBot from './gundamBot';

describe('GundamBot', () => {
	// Test fixtures
	let gundamBot: ReplyBot;
	let mockMessage: Partial<Message<boolean>>;

	beforeEach(() => {
		// Arrange - Common setup for all tests
		jest.clearAllMocks();

		// Reset pattern trigger response
		patternShouldTriggerResponse = TEST.CONDITIONS.TRIGGER;

		// Create message mock
		mockMessage = createMockMessage(TEST.USER_NAME);
		if (mockMessage.author) {
			Object.defineProperty(mockMessage.author, 'displayName', {
				value: TEST.USER_NAME,
				configurable: true
			});
		}

		// Create bot instance
		gundamBot = createGundamBot();
	});

	describe('identity', () => {
		it('should have correct name and avatar URL', () => {
			// Act
			const identity = gundamBot.getIdentity();

			// Assert
			expect(identity.name).toBe(BOT_NAME);
			expect(identity.avatarUrl).toBe(AVATAR_URL);
		});
	});

	describe('message handling', () => {
		it('should ignore messages from bots', async () => {
			// Arrange
			const mockMember = createMockGuildMember(TEST.BOT_USER_ID, TEST.BOT_USER_NAME);
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			mockMessage.content = TEST.MESSAGE.GUNDAM;

			// Act
			await gundamBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "gundam" as a standalone word', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.GUNDAM;

			// Act
			await gundamBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: BOT_NAME,
					avatarURL: AVATAR_URL,
					content: GUNDAM_RESPONSE
				})
			);
		});

		it('should respond to "GUNDAM" (case insensitive)', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.GUNDAM_UPPERCASE;

			// Act
			await gundamBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: BOT_NAME,
					avatarURL: AVATAR_URL,
					content: GUNDAM_RESPONSE
				})
			);
		});

		it('should respond to "gandam" (misspelling)', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.GANDAM;

			// Act
			await gundamBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: BOT_NAME,
					avatarURL: AVATAR_URL,
					content: GUNDAM_RESPONSE
				})
			);
		});

		it('should respond to "gundam" in a sentence', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.GUNDAM_IN_SENTENCE;

			// Act
			await gundamBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: BOT_NAME,
					avatarURL: AVATAR_URL,
					content: GUNDAM_RESPONSE
				})
			);
		});

		it('should NOT respond to words containing "gundam" as a substring', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.GUNDAM_AS_SUBSTRING;
			patternShouldTriggerResponse = TEST.CONDITIONS.NO_TRIGGER;

			// Act
			await gundamBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should NOT respond to unrelated messages', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.UNRELATED;
			patternShouldTriggerResponse = TEST.CONDITIONS.NO_TRIGGER;

			// Act
			await gundamBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
