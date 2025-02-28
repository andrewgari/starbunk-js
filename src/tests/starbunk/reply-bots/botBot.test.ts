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

// Create variables to control mock behaviors
let randomChanceShouldTrigger = true;

jest.mock('../../../starbunk/bots/triggers/conditions/randomChanceCondition', () => {
	return {
		RandomChanceCondition: jest.fn().mockImplementation(() => ({
			shouldTrigger: jest.fn().mockImplementation((message) => {
				// Only trigger on messages containing "bot" or from bot users
				if (message &&
					((message.content && message.content.toLowerCase().includes('bot')) ||
						(message.author && message.author.bot))) {
					return Promise.resolve(randomChanceShouldTrigger);
				}
				return Promise.resolve(false);
			})
		}))
	};
});

// Real imports after all mocks
import { Message, TextChannel, User } from 'discord.js';
import createBotBot from '../../../starbunk/bots/reply-bots/botBot';
import ReplyBot from '../../../starbunk/bots/replyBot';
import webhookService from '../../../webhooks/webhookService';
import { createMockGuildMember, createMockMessage } from '../../mocks/discordMocks';

describe('BotBot', () => {
	let botBot: ReplyBot;
	let mockMessage: Partial<Message<boolean>>;

	beforeEach(() => {
		// Reset all mocks
		jest.clearAllMocks();

		// Reset variables
		randomChanceShouldTrigger = true;

		// Create message mock
		mockMessage = createMockMessage('TestUser');
		if (mockMessage.author) {
			Object.defineProperty(mockMessage.author, 'displayName', {
				value: 'TestUser',
				configurable: true
			});
		}

		// Create bot instance
		botBot = createBotBot();
	});

	describe('bot configuration', () => {
		it('should have correct name', () => {
			// Act
			const identity = botBot.getIdentity();

			// Assert
			expect(identity.name).toBe('BotBot');
		});

		it('should have correct avatar URL', () => {
			// Act
			const identity = botBot.getIdentity();

			// Assert
			// Use the actual URL from the implementation
			expect(identity.avatarUrl).toBe('https://cdn-icons-png.flaticon.com/512/4944/4944377.png');
		});
	});

	describe('message handling', () => {
		it('should ignore messages from bots when not triggered by random chance', async () => {
			// Arrange
			randomChanceShouldTrigger = false;
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			mockMessage.content = 'Hello there';

			// Act
			await botBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to messages from bots when triggered by random chance', async () => {
			// Arrange
			randomChanceShouldTrigger = true;
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			mockMessage.content = 'Hello there';

			// Act
			await botBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'BotBot',
					avatarURL: 'https://cdn-icons-png.flaticon.com/512/4944/4944377.png',
					content: "Why hello there, fellow bot 🤖"
				})
			);
		});

		it('should respond to "bot" when random chance is met', async () => {
			// Arrange
			randomChanceShouldTrigger = true;
			mockMessage.content = 'bot';

			// Act
			await botBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'BotBot',
					avatarURL: 'https://cdn-icons-png.flaticon.com/512/4944/4944377.png',
					content: "Why hello there, fellow bot 🤖"
				})
			);
		});

		it('should NOT respond to "bot" when random chance is not met', async () => {
			// Arrange
			randomChanceShouldTrigger = false;
			mockMessage.content = 'bot';

			// Act
			await botBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should NOT respond to unrelated messages', async () => {
			// Arrange
			mockMessage.content = 'Hello there!';

			// Act
			await botBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
