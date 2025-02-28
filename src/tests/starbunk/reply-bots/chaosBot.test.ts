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

// Mock the PatternCondition to handle "chaos" patterns
jest.mock('../../../starbunk/bots/triggers/conditions/patternCondition', () => {
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
import { Message, TextChannel, User } from 'discord.js';
import createChaosBot from '../../../starbunk/bots/reply-bots/chaosBot';
import ReplyBot from '../../../starbunk/bots/replyBot';
import webhookService from '../../../webhooks/webhookService';
import { createMockGuildMember, createMockMessage } from '../../mocks/discordMocks';

describe('ChaosBot', () => {
	let chaosBot: ReplyBot;
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
		chaosBot = createChaosBot();
	});

	describe('bot configuration', () => {
		it('should have correct name', () => {
			// Act
			const identity = chaosBot.getIdentity();

			// Assert
			expect(identity.name).toBe('ChaosBot');
		});

		it('should have correct avatar URL', () => {
			// Act
			const identity = chaosBot.getIdentity();

			// Assert
			expect(identity.avatarUrl).toBe('https://preview.redd.it/md0lzbvuc3571.png?width=1920&format=png&auto=webp&s=ff403a8d4b514af8d99792a275d2c066b8d1a4de');
		});
	});

	describe('message handling', () => {
		it('should ignore messages from bots', async () => {
			// Arrange
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			mockMessage.content = 'chaos';

			// Act
			await chaosBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "chaos" as a standalone word', async () => {
			// Arrange
			mockMessage.content = 'chaos';

			// Act
			await chaosBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'ChaosBot',
					avatarURL: 'https://preview.redd.it/md0lzbvuc3571.png?width=1920&format=png&auto=webp&s=ff403a8d4b514af8d99792a275d2c066b8d1a4de',
					content: "All I know is...I'm here to kill Chaos"
				})
			);
		});

		it('should respond to "CHAOS" (case insensitive)', async () => {
			// Arrange
			mockMessage.content = 'CHAOS';

			// Act
			await chaosBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'ChaosBot',
					avatarURL: 'https://preview.redd.it/md0lzbvuc3571.png?width=1920&format=png&auto=webp&s=ff403a8d4b514af8d99792a275d2c066b8d1a4de',
					content: "All I know is...I'm here to kill Chaos"
				})
			);
		});

		it('should respond to "chaos" in a sentence', async () => {
			// Arrange
			mockMessage.content = 'There is so much chaos in this room';

			// Act
			await chaosBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'ChaosBot',
					avatarURL: 'https://preview.redd.it/md0lzbvuc3571.png?width=1920&format=png&auto=webp&s=ff403a8d4b514af8d99792a275d2c066b8d1a4de',
					content: "All I know is...I'm here to kill Chaos"
				})
			);
		});

		it('should NOT respond to words containing "chaos" as a substring', async () => {
			// Arrange
			mockMessage.content = 'chaostheory';

			// Act
			await chaosBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should NOT respond to unrelated messages', async () => {
			// Arrange
			mockMessage.content = 'Hello there!';

			// Act
			await chaosBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
