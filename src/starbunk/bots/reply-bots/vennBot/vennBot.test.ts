// Mocks need to be at the very top, before any imports
import { mockWebhookServiceDefault } from '@/tests/mocks/serviceMocks';
jest.mock('@/webhooks/webhookService', () => mockWebhookServiceDefault());

// Import the model constants
import { AVATAR_URL, BOT_NAME, CRINGE_RESPONSES, TEST } from './vennBotModel';

// Create variables to control mock behaviors
let randomChanceShouldTrigger = TEST.CONDITIONS.RANDOM_CHANCE_TRIGGER;
let userConditionShouldTrigger = TEST.CONDITIONS.USER_CONDITION_TRIGGER;

// Mock the RandomChanceCondition
jest.mock('@/starbunk/bots/triggers/conditions/randomChanceCondition', () => {
	return {
		RandomChanceCondition: jest.fn().mockImplementation(() => ({
			shouldTrigger: jest.fn().mockImplementation(() => Promise.resolve(randomChanceShouldTrigger))
		}))
	};
});

// Mock the UserCondition
jest.mock('@/starbunk/bots/triggers/conditions/userCondition', () => {
	return {
		UserCondition: jest.fn().mockImplementation(() => ({
			shouldTrigger: jest.fn().mockImplementation(() => Promise.resolve(userConditionShouldTrigger))
		}))
	};
});

// Mock the UserID for Venn
jest.mock('@/discord/userID', () => ({
	Venn: TEST.VENN_USER_ID
}));

// Real imports after all mocks
import { createMockGuildMember, createMockMessage } from '@/tests/mocks/discordMocks';
import webhookService from '@/webhooks/webhookService';
import { Message, TextChannel, User } from 'discord.js';
import ReplyBot from '../../replyBot';
import createVennBot from './vennBot';

describe('VennBot', () => {
	// Test fixtures
	let vennBot: ReplyBot;
	let mockMessage: Partial<Message<boolean>>;

	beforeEach(() => {
		// Arrange - Common setup for all tests
		jest.clearAllMocks();

		// Reset condition variables to default test values
		randomChanceShouldTrigger = TEST.CONDITIONS.RANDOM_CHANCE_TRIGGER;
		userConditionShouldTrigger = TEST.CONDITIONS.USER_CONDITION_TRIGGER;

		// Create message mock
		mockMessage = createMockMessage(TEST.USER_NAME);
		if (mockMessage.author) {
			Object.defineProperty(mockMessage.author, 'displayName', {
				value: TEST.USER_NAME,
				configurable: true
			});
		}

		// Create bot instance
		vennBot = createVennBot();
	});

	describe('identity', () => {
		it('should have correct name and avatar URL', () => {
			// Act
			const identity = vennBot.getIdentity();

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
			mockMessage.content = TEST.MESSAGE.HELLO;

			// Act
			await vennBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to messages from Venn with a random cringe message when both conditions are met', async () => {
			// Arrange
			mockMessage.author = createMockGuildMember(TEST.VENN_USER_ID, TEST.VENN_USER_NAME).user as User;
			Object.defineProperty(mockMessage.author, 'id', {
				value: TEST.VENN_USER_ID,
				configurable: true
			});
			mockMessage.content = TEST.MESSAGE.HELLO;
			userConditionShouldTrigger = TEST.CONDITIONS.USER_CONDITION_TRIGGER;
			randomChanceShouldTrigger = TEST.CONDITIONS.RANDOM_CHANCE_TRIGGER;

			// Act
			await vennBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: BOT_NAME,
					avatarURL: AVATAR_URL,
					content: expect.stringMatching(new RegExp(CRINGE_RESPONSES.map(r => r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')))
				})
			);
		});

		it('should NOT respond to messages from Venn when random chance is not met', async () => {
			// Arrange
			mockMessage.author = createMockGuildMember(TEST.VENN_USER_ID, TEST.VENN_USER_NAME).user as User;
			Object.defineProperty(mockMessage.author, 'id', {
				value: TEST.VENN_USER_ID,
				configurable: true
			});
			mockMessage.content = TEST.MESSAGE.HELLO;
			userConditionShouldTrigger = TEST.CONDITIONS.USER_CONDITION_TRIGGER;
			randomChanceShouldTrigger = TEST.CONDITIONS.RANDOM_CHANCE_NO_TRIGGER;

			// Act
			await vennBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should NOT respond to messages from other users regardless of content', async () => {
			// Arrange
			mockMessage.author = createMockGuildMember(TEST.OTHER_USER_ID, TEST.OTHER_USER_NAME).user as User;
			Object.defineProperty(mockMessage.author, 'id', {
				value: TEST.OTHER_USER_ID,
				configurable: true
			});
			mockMessage.content = TEST.MESSAGE.HELLO;
			userConditionShouldTrigger = TEST.CONDITIONS.USER_CONDITION_NO_TRIGGER;
			randomChanceShouldTrigger = TEST.CONDITIONS.RANDOM_CHANCE_TRIGGER;

			// Act
			await vennBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to messages from Venn containing any content when both conditions are met', async () => {
			// Arrange
			mockMessage.author = createMockGuildMember(TEST.VENN_USER_ID, TEST.VENN_USER_NAME).user as User;
			Object.defineProperty(mockMessage.author, 'id', {
				value: TEST.VENN_USER_ID,
				configurable: true
			});
			mockMessage.content = TEST.MESSAGE.UNRELATED;
			userConditionShouldTrigger = TEST.CONDITIONS.USER_CONDITION_TRIGGER;
			randomChanceShouldTrigger = TEST.CONDITIONS.RANDOM_CHANCE_TRIGGER;

			// Act
			await vennBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: BOT_NAME,
					avatarURL: AVATAR_URL,
					content: expect.stringMatching(new RegExp(CRINGE_RESPONSES.map(r => r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')))
				})
			);
		});
	});
});
