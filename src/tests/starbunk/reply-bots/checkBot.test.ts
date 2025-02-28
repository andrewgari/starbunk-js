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

// Mock the PatternCondition to handle czech/check patterns
jest.mock('../../../starbunk/bots/triggers/conditions/patternCondition', () => {
	const PatternConditionMock = jest.fn();

	// Keep track of the pattern being used for each instance
	const mockInstances = new Map();

	PatternConditionMock.mockImplementation((pattern) => {
		const instance = {
			shouldTrigger: jest.fn().mockImplementation((message) => {
				if (message && message.content) {
					if (pattern === 'czech' && /\bczech\b/i.test(message.content)) {
						return Promise.resolve(true);
					}
					if (pattern === 'check' && /\bcheck\b/i.test(message.content)) {
						return Promise.resolve(true);
					}
				}
				return Promise.resolve(false);
			})
		};
		mockInstances.set(pattern, instance);
		return instance;
	});

	return {
		PatternCondition: PatternConditionMock,
		__mockInstances: mockInstances
	};
});

// Mock the Patterns used by CheckBot
jest.mock('../../../starbunk/bots/triggers/conditions/patterns', () => ({
	Patterns: {
		WORD_CZECH: 'czech',
		WORD_CHECK: 'check'
	}
}));

// Real imports after all mocks
import { Message, TextChannel, User } from 'discord.js';
import createCheckBot from '../../../starbunk/bots/reply-bots/checkBot';
import ReplyBot from '../../../starbunk/bots/replyBot';
import webhookService from '../../../webhooks/webhookService';
import { createMockGuildMember, createMockMessage } from '../../mocks/discordMocks';

describe('CheckBot', () => {
	let checkBot: ReplyBot;
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
		checkBot = createCheckBot();
	});

	describe('bot configuration', () => {
		it('should have correct name', () => {
			// Act
			const identity = checkBot.getIdentity();

			// Assert
			expect(identity.name).toBe('CheckBot');
		});

		it('should have correct avatar URL', () => {
			// Act
			const identity = checkBot.getIdentity();

			// Assert
			expect(identity.avatarUrl).toBe('https://m.media-amazon.com/images/I/21Unzn9U8sL._AC_.jpg');
		});
	});

	describe('message handling', () => {
		it('should ignore messages from bots', async () => {
			// Arrange
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			mockMessage.content = 'czech';

			// Act
			await checkBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "czech" with correction to "check"', async () => {
			// Arrange
			mockMessage.content = 'czech';

			// Act
			await checkBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'CheckBot',
					avatarURL: 'https://m.media-amazon.com/images/I/21Unzn9U8sL._AC_.jpg',
					content: "I believe you mean 'check' :wink:"
				})
			);
		});

		it('should respond to "czech" in a sentence', async () => {
			// Arrange
			mockMessage.content = 'I am going to czech republic';

			// Act
			await checkBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'CheckBot',
					avatarURL: 'https://m.media-amazon.com/images/I/21Unzn9U8sL._AC_.jpg',
					content: "I believe you mean 'check' :wink:"
				})
			);
		});

		it('should respond to "check" with correction to "czech"', async () => {
			// Arrange
			mockMessage.content = 'check';

			// Act
			await checkBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'CheckBot',
					avatarURL: 'https://m.media-amazon.com/images/I/21Unzn9U8sL._AC_.jpg',
					content: "I believe you mean 'czech' :wink:"
				})
			);
		});

		it('should respond to "check" in a sentence', async () => {
			// Arrange
			mockMessage.content = 'Let me check that for you';

			// Act
			await checkBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'CheckBot',
					avatarURL: 'https://m.media-amazon.com/images/I/21Unzn9U8sL._AC_.jpg',
					content: "I believe you mean 'czech' :wink:"
				})
			);
		});

		it('should NOT respond to unrelated messages', async () => {
			// Arrange
			mockMessage.content = 'Hello there!';

			// Act
			await checkBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
