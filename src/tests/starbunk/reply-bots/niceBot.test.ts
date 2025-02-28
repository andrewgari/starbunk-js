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

// Mock the PatternCondition to handle "69" patterns
jest.mock('../../../starbunk/bots/triggers/conditions/patternCondition', () => {
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
import { Message, TextChannel, User } from 'discord.js';
import createNiceBot from '../../../starbunk/bots/reply-bots/niceBot';
import ReplyBot from '../../../starbunk/bots/replyBot';
import webhookService from '../../../webhooks/webhookService';
import { createMockGuildMember, createMockMessage } from '../../mocks/discordMocks';

describe('NiceBot', () => {
	let niceBot: ReplyBot;
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
		niceBot = createNiceBot();
	});

	describe('bot configuration', () => {
		it('should have correct name', () => {
			// Act
			const identity = niceBot.getIdentity();

			// Assert
			expect(identity.name).toBe('NiceBot');
		});

		it('should have correct avatar URL', () => {
			// Act
			const identity = niceBot.getIdentity();

			// Assert
			expect(identity.avatarUrl).toBe('https://cdn.pixabay.com/photo/2012/04/24/17/36/nice-40363_1280.png');
		});
	});

	describe('message handling', () => {
		it('should ignore messages from bots', async () => {
			// Arrange
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			mockMessage.content = '69';

			// Act
			await niceBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "69"', async () => {
			// Arrange
			mockMessage.content = '69';

			// Act
			await niceBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'NiceBot',
					avatarURL: 'https://cdn.pixabay.com/photo/2012/04/24/17/36/nice-40363_1280.png',
					content: 'Nice.'
				})
			);
		});

		it('should respond to "69" in a sentence', async () => {
			// Arrange
			mockMessage.content = 'The answer is 69 my friend';

			// Act
			await niceBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'NiceBot',
					avatarURL: 'https://cdn.pixabay.com/photo/2012/04/24/17/36/nice-40363_1280.png',
					content: 'Nice.'
				})
			);
		});

		it('should respond to "sixty-nine"', async () => {
			// Arrange
			mockMessage.content = 'sixty-nine';

			// Act
			await niceBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'NiceBot',
					avatarURL: 'https://cdn.pixabay.com/photo/2012/04/24/17/36/nice-40363_1280.png',
					content: 'Nice.'
				})
			);
		});

		it('should respond to "sixtynine"', async () => {
			// Arrange
			mockMessage.content = 'sixtynine';

			// Act
			await niceBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'NiceBot',
					avatarURL: 'https://cdn.pixabay.com/photo/2012/04/24/17/36/nice-40363_1280.png',
					content: 'Nice.'
				})
			);
		});

		it('should NOT respond to unrelated messages', async () => {
			// Arrange
			mockMessage.content = 'Hello there!';

			// Act
			await niceBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should NOT respond to other numbers', async () => {
			// Arrange
			mockMessage.content = '420';

			// Act
			await niceBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
