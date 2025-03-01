// Mocks need to be at the very top, before any imports
import { mockWebhookServiceDefault } from '@/tests/mocks/serviceMocks';
jest.mock('@/webhooks/webhookService', () => mockWebhookServiceDefault());

// Import the model constants
import { BOT_NAME, NICE_BOT_AVATAR_URL, NICE_BOT_RESPONSE, TEST } from './niceBotModel';

// Mock the PatternCondition to handle "69" patterns
jest.mock('@/starbunk/bots/triggers/conditions/patternCondition', () => {
	return {
		PatternCondition: jest.fn().mockImplementation(() => ({
			shouldTrigger: jest.fn().mockImplementation((message) => {
				// Only trigger on messages containing 69, sixty-nine, or sixtynine
				if (message && message.content) {
					const nicePattern = /\b69\b|sixty-?nine/i;
					return Promise.resolve(nicePattern.test(message.content));
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
import createNiceBot from './niceBot';

describe('NiceBot', () => {
	// Test fixtures
	let niceBot: ReplyBot;
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
		niceBot = createNiceBot();
	});

	describe('identity', () => {
		it('should have correct name and avatar URL', () => {
			// Act
			const identity = niceBot.getIdentity();

			// Assert
			expect(identity.name).toBe(BOT_NAME);
			expect(identity.avatarUrl).toBe(NICE_BOT_AVATAR_URL);
		});
	});

	describe('message handling', () => {
		it('should ignore messages from bots', async () => {
			// Arrange
			const mockMember = createMockGuildMember(TEST.BOT_USER_ID, TEST.BOT_USER_NAME);
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			mockMessage.content = TEST.MESSAGE.SIXTY_NINE;

			// Act
			await niceBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "69"', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.SIXTY_NINE;

			// Act
			await niceBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: BOT_NAME,
					avatarURL: NICE_BOT_AVATAR_URL,
					content: NICE_BOT_RESPONSE
				})
			);
		});

		it('should respond to "69" in a sentence', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.SIXTY_NINE_IN_SENTENCE;

			// Act
			await niceBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: BOT_NAME,
					avatarURL: NICE_BOT_AVATAR_URL,
					content: NICE_BOT_RESPONSE
				})
			);
		});

		it('should respond to "sixty-nine"', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.SIXTY_NINE_SPELLED;

			// Act
			await niceBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: BOT_NAME,
					avatarURL: NICE_BOT_AVATAR_URL,
					content: NICE_BOT_RESPONSE
				})
			);
		});

		it('should respond to "sixtynine"', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.SIXTY_NINE_NO_HYPHEN;

			// Act
			await niceBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: BOT_NAME,
					avatarURL: NICE_BOT_AVATAR_URL,
					content: NICE_BOT_RESPONSE
				})
			);
		});

		it('should NOT respond to unrelated messages', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.UNRELATED;

			// Act
			await niceBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should NOT respond to other numbers', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.OTHER_NUMBER;

			// Act
			await niceBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
