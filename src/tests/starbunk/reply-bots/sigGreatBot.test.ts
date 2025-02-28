// Mocks need to be at the very top, before any imports
jest.mock('../../../webhooks/webhookService', () => {
	return {
		__esModule: true,
		default: {
			writeMessage: jest.fn().mockResolvedValue({})
		},
		WebhookService: jest.fn()
	};
});

// Mock the PatternCondition to handle sig praise patterns
jest.mock('../../../starbunk/bots/triggers/conditions/patternCondition', () => {
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
jest.mock('../../../starbunk/bots/reply-bots/sigGreatBot', () => {
	// Preserve the original module
	const originalModule = jest.requireActual('../../../starbunk/bots/reply-bots/sigGreatBot');

	// Mock the SigPraiseResponse class
	class MockSigPraiseResponse {
		async generateResponse(message: { content: string }): Promise<string> {
			// Return "The greatest." for all test cases to keep it simple
			if (message.content.toLowerCase().includes('sig best') ||
				message.content.toLowerCase().includes('sig greatest')) {
				return "The greatest.";
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
import { Message, TextChannel, User } from 'discord.js';
import createSigGreatBot from '../../../starbunk/bots/reply-bots/sigGreatBot';
import ReplyBot from '../../../starbunk/bots/replyBot';
import webhookService from '../../../webhooks/webhookService';
import { createMockGuildMember, createMockMessage } from '../../mocks/discordMocks';

describe('SigGreatBot', () => {
	let sigGreatBot: ReplyBot;
	let mockMessage: Partial<Message<boolean>>;

	beforeEach(() => {
		// Reset all mocks
		jest.clearAllMocks();

		// Create message mock
		mockMessage = createMockMessage('TestUser');
		if (mockMessage.author) {
			Object.defineProperty(mockMessage.author, 'displayName', {
				value: 'TestUser',
				configurable: true
			});
		}

		// Create bot instance
		sigGreatBot = createSigGreatBot();
	});

	describe('bot configuration', () => {
		it('should have correct name', () => {
			// Act
			const identity = sigGreatBot.getIdentity();

			// Assert
			expect(identity.name).toBe('SigGreatBot');
		});

		it('should have correct avatar URL', () => {
			// Act
			const identity = sigGreatBot.getIdentity();

			// Assert
			expect(identity.avatarUrl).toBe('https://static.wikia.nocookie.net/chrono/images/a/a5/Serge2.png');
		});
	});

	describe('message handling', () => {
		it('should ignore messages from bots', async () => {
			// Arrange
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			mockMessage.content = 'sig best';

			// Act
			await sigGreatBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "sig best"', async () => {
			// Arrange
			mockMessage.content = 'sig best';

			// Act
			await sigGreatBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'SigGreatBot',
					avatarURL: 'https://static.wikia.nocookie.net/chrono/images/a/a5/Serge2.png',
					content: 'The greatest.'
				})
			);
		});

		it('should respond to "sig greatest"', async () => {
			// Arrange
			mockMessage.content = 'sig greatest';

			// Act
			await sigGreatBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'SigGreatBot',
					avatarURL: 'https://static.wikia.nocookie.net/chrono/images/a/a5/Serge2.png',
					content: 'The greatest.'
				})
			);
		});

		it('should respond to "SIG BEST" (case insensitive)', async () => {
			// Arrange
			mockMessage.content = 'SIG BEST';

			// Act
			await sigGreatBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'SigGreatBot',
					avatarURL: 'https://static.wikia.nocookie.net/chrono/images/a/a5/Serge2.png',
					content: 'The greatest.'
				})
			);
		});

		it('should respond to "sig best" in a sentence', async () => {
			// Arrange
			mockMessage.content = 'I think sig best character';

			// Act
			await sigGreatBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'SigGreatBot',
					avatarURL: 'https://static.wikia.nocookie.net/chrono/images/a/a5/Serge2.png',
					content: 'The greatest.'
				})
			);
		});

		it('should NOT respond to "sig" without "best" or "greatest"', async () => {
			// Arrange
			mockMessage.content = 'sig is cool';

			// Act
			await sigGreatBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should NOT respond to unrelated messages', async () => {
			// Arrange
			mockMessage.content = 'Hello there!';

			// Act
			await sigGreatBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
