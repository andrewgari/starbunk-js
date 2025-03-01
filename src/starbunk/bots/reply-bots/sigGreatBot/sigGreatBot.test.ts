// Mocks need to be at the very top, before any imports
import { mockWebhookServiceDefault } from '@/tests/mocks/serviceMocks';
jest.mock('@/webhooks/webhookService', () => mockWebhookServiceDefault());

// Import the model constants
import { BOT_NAME, SIG_GREAT_BOT_AVATAR_URL, TEST } from './sigGreatBotModel';

// Mock the PatternCondition to handle sig praise patterns
jest.mock('@/starbunk/bots/triggers/conditions/patternCondition', () => {
	return {
		PatternCondition: jest.fn().mockImplementation(() => ({
			shouldTrigger: jest.fn().mockImplementation((message) => {
				// Only trigger on messages containing "sig best" or "sig greatest"
				if (message && message.content) {
					const sigPraisePattern = /\bsig\s+(is\s+)?(the\s+)?(best|greatest)\b/i;
					return Promise.resolve(sigPraisePattern.test(message.content));
				}
				return Promise.resolve(false);
			})
		}))
	};
});

// Mock SigPraiseResponse class to return consistent response for tests
jest.mock('./sigGreatBot', () => {
	// Preserve the original module
	const originalModule = jest.requireActual('./sigGreatBot');

	// Mock the SigPraiseResponse class
	class MockSigPraiseResponse {
		async generateResponse(message: { content: string }): Promise<string> {
			// Return "The greatest." for all test cases to keep it simple
			if (message.content.toLowerCase().includes('sig best') ||
				message.content.toLowerCase().includes('sig greatest')) {
				return TEST.RESPONSE.DEFAULT;
			}
			return "";
		}
	}

	// Return the original function but replace the response generator
	const mockCreateSigGreatBot = function (webhookServiceParam: typeof webhookService): ReplyBot {
		// Use the original implementation but with our mocked components
		return originalModule.default(webhookServiceParam);
	};

	// Export the mock function
	return {
		__esModule: true,
		default: mockCreateSigGreatBot,
		// Mock the class used internally
		SigPraiseResponse: MockSigPraiseResponse
	};
});

// Real imports after all mocks
import { createMockGuildMember, createMockMessage } from '@/tests/mocks/discordMocks';
import webhookService from '@/webhooks/webhookService';
import { Message, TextChannel, User } from 'discord.js';
import ReplyBot from '../../replyBot';
import createSigGreatBot from './sigGreatBot';

describe('SigGreatBot', () => {
	// Test fixtures
	let sigGreatBot: ReplyBot;
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
		sigGreatBot = createSigGreatBot();
	});

	describe('identity', () => {
		it('should have correct name and avatar URL', () => {
			// Act
			const identity = sigGreatBot.getIdentity();

			// Assert
			expect(identity.name).toBe(BOT_NAME);
			expect(identity.avatarUrl).toBe(SIG_GREAT_BOT_AVATAR_URL);
		});
	});

	describe('message handling', () => {
		it('should ignore messages from bots', async () => {
			// Arrange
			mockMessage.author = {
				...createMockGuildMember(TEST.BOT_USER_ID, TEST.BOT_USER_NAME).user,
				bot: true
			} as User;
			mockMessage.content = TEST.MESSAGE.SIG_BEST;

			// Act
			await sigGreatBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "sig best"', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.SIG_BEST;

			// Act
			await sigGreatBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: BOT_NAME,
					avatarURL: SIG_GREAT_BOT_AVATAR_URL,
					content: TEST.RESPONSE.DEFAULT
				})
			);
		});

		it('should respond to "sig greatest"', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.SIG_GREATEST;

			// Act
			await sigGreatBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: BOT_NAME,
					avatarURL: SIG_GREAT_BOT_AVATAR_URL,
					content: TEST.RESPONSE.DEFAULT
				})
			);
		});

		it('should respond to "SIG BEST" (case insensitive)', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.SIG_BEST_UPPERCASE;

			// Act
			await sigGreatBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: BOT_NAME,
					avatarURL: SIG_GREAT_BOT_AVATAR_URL,
					content: TEST.RESPONSE.DEFAULT
				})
			);
		});

		it('should respond to "sig best" in a sentence', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.SIG_BEST_IN_SENTENCE;

			// Act
			await sigGreatBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: BOT_NAME,
					avatarURL: SIG_GREAT_BOT_AVATAR_URL,
					content: TEST.RESPONSE.DEFAULT
				})
			);
		});

		it('should NOT respond to "sig" without "best" or "greatest"', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.SIG_WITHOUT_PRAISE;

			// Act
			await sigGreatBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should NOT respond to unrelated messages', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.UNRELATED;

			// Act
			await sigGreatBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
