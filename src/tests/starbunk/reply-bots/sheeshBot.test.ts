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

// Store original Math.random
const originalRandom = Math.random;

// Mock the PatternCondition to handle "sheesh" patterns
jest.mock('../../../starbunk/bots/triggers/conditions/patternCondition', () => {
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
import { Message, TextChannel, User } from 'discord.js';
import createSheeshBot from '../../../starbunk/bots/reply-bots/sheeshBot';
import ReplyBot from '../../../starbunk/bots/replyBot';
import webhookService from '../../../webhooks/webhookService';
import { createMockGuildMember, createMockMessage } from '../../mocks/discordMocks';

describe('SheeshBot', () => {
	let sheeshBot: ReplyBot;
	let mockMessage: Partial<Message<boolean>>;

	beforeEach(() => {
		// Reset all mocks
		jest.clearAllMocks();

		// Mock Math.random to return a consistent value for testing
		Math.random = jest.fn().mockReturnValue(0.5);

		// Create message mock
		mockMessage = createMockMessage('TestUser');
		if (mockMessage.author) {
			Object.defineProperty(mockMessage.author, 'displayName', {
				value: 'TestUser',
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

	describe('bot configuration', () => {
		it('should have correct name', () => {
			// Act
			const identity = sheeshBot.getIdentity();

			// Assert
			expect(identity.name).toBe('SheeshBot');
		});

		it('should have correct avatar URL', () => {
			// Act
			const identity = sheeshBot.getIdentity();

			// Assert
			expect(identity.avatarUrl).toBe('https://i.kym-cdn.com/photos/images/newsfeed/002/297/355/cb3');
		});
	});

	describe('message handling', () => {
		it('should ignore messages from bots', async () => {
			// Arrange
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			mockMessage.content = 'sheesh';

			// Act
			await sheeshBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "sheesh" with random length sheesh', async () => {
			// Arrange
			mockMessage.content = 'sheesh';

			// With Math.random mocked to 0.5, we expect 0.5 * 15 + 3 = 10.5 -> 10 'e's
			const expectedSheesh = 'Sheeeeeeeeeesh';

			// Act
			await sheeshBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'SheeshBot',
					avatarURL: 'https://i.kym-cdn.com/photos/images/newsfeed/002/297/355/cb3',
					content: expectedSheesh
				})
			);
		});

		it('should respond to "SHEESH" (case insensitive)', async () => {
			// Arrange
			mockMessage.content = 'SHEESH';

			// Act
			await sheeshBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'SheeshBot',
					avatarURL: 'https://i.kym-cdn.com/photos/images/newsfeed/002/297/355/cb3',
					content: 'Sheeeeeeeeeesh'
				})
			);
		});

		it('should respond to "sheesh" with varying number of "e"s', async () => {
			// Arrange
			mockMessage.content = 'sheeeeesh';

			// Act
			await sheeshBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'SheeshBot',
					avatarURL: 'https://i.kym-cdn.com/photos/images/newsfeed/002/297/355/cb3',
					content: 'Sheeeeeeeeeesh'
				})
			);
		});

		it('should respond to "sheesh" in a sentence', async () => {
			// Arrange
			mockMessage.content = 'I said sheesh to that';

			// Act
			await sheeshBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'SheeshBot',
					avatarURL: 'https://i.kym-cdn.com/photos/images/newsfeed/002/297/355/cb3',
					content: 'Sheeeeeeeeeesh'
				})
			);
		});

		it('should NOT respond to unrelated messages', async () => {
			// Arrange
			mockMessage.content = 'Hello there!';

			// Act
			await sheeshBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
