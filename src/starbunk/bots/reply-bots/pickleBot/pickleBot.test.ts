// Mocks need to be at the very top, before any imports
import { mockWebhookServiceDefault } from '@/tests/mocks/serviceMocks';
jest.mock('@/webhooks/webhookService', () => mockWebhookServiceDefault());

// Import the model constants
import { BOT_NAME, PICKLE_BOT_AVATAR_URL, PICKLE_BOT_RESPONSE, TEST } from './pickleBotModel';

// Mock the AllConditions class
jest.mock('@/starbunk/bots/triggers/conditions/allConditions', () => {
	return {
		AllConditions: jest.fn().mockImplementation(() => {
			return {
				shouldTrigger: jest.fn().mockImplementation((message) => {
					// Return true if message contains "gremlin" (case insensitive)
					if (message.content && message.content.toLowerCase().includes('gremlin')) {
						return Promise.resolve(true);
					}

					// Return true if message is from Sig
					if (message.author && message.author.id === TEST.SIG_USER_ID) {
						return Promise.resolve(true);
					}

					return Promise.resolve(false);
				})
			};
		})
	};
});

// Mock the UserCondition class
jest.mock('@/starbunk/bots/triggers/conditions/userCondition', () => {
	return {
		UserCondition: jest.fn().mockImplementation(() => {
			return {
				shouldTrigger: jest.fn().mockResolvedValue(false)
			};
		})
	};
});

// Mock the UserID for Sig
jest.mock('@/discord/userID', () => ({
	Sig: TEST.SIG_USER_ID
}));

// Real imports after all mocks
import { createMockGuildMember, createMockMessage } from '@/tests/mocks/discordMocks';
import webhookService from '@/webhooks/webhookService';
import { Message, TextChannel, User } from 'discord.js';
import ReplyBot from '../../replyBot';
import createPickleBot from './pickleBot';

describe('PickleBot', () => {
	// Test fixtures
	let pickleBot: ReplyBot;
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
		pickleBot = createPickleBot();
	});

	describe('identity', () => {
		it('should have correct name and avatar URL', () => {
			// Act
			const identity = pickleBot.getIdentity();

			// Assert
			expect(identity.name).toBe(BOT_NAME);
			expect(identity.avatarUrl).toBe(PICKLE_BOT_AVATAR_URL);
		});
	});

	describe('message handling', () => {
		it('should ignore messages from bots', async () => {
			// Arrange
			const mockMember = createMockGuildMember(TEST.BOT_USER_ID, TEST.BOT_USER_NAME);
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			mockMessage.content = TEST.MESSAGE.GREMLIN;

			// Act
			await pickleBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "gremlin"', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.GREMLIN;

			// Act
			await pickleBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: BOT_NAME,
					avatarURL: PICKLE_BOT_AVATAR_URL,
					content: PICKLE_BOT_RESPONSE
				})
			);
		});

		it('should respond to "GREMLIN" (case insensitive)', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.GREMLIN_UPPERCASE;

			// Act
			await pickleBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: BOT_NAME,
					avatarURL: PICKLE_BOT_AVATAR_URL,
					content: PICKLE_BOT_RESPONSE
				})
			);
		});

		it('should respond when "gremlin" is part of a sentence', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.GREMLIN_IN_SENTENCE;

			// Act
			await pickleBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: BOT_NAME,
					avatarURL: PICKLE_BOT_AVATAR_URL,
					content: PICKLE_BOT_RESPONSE
				})
			);
		});

		it('should respond to messages from Sig with random chance', async () => {
			// Arrange
			const mockSigMember = createMockGuildMember(TEST.SIG_USER_ID, TEST.SIG_USER_NAME);
			mockMessage.author = mockSigMember.user as User;
			Object.defineProperty(mockMessage.author, 'id', { value: TEST.SIG_USER_ID, configurable: true });
			mockMessage.content = TEST.MESSAGE.NORMAL_MESSAGE;

			// Mock the RandomChanceCondition to always return true for testing
			jest.mock('@/starbunk/bots/triggers/conditions/randomChanceCondition', () => ({
				RandomChanceCondition: jest.fn().mockImplementation(() => ({
					shouldTrigger: jest.fn().mockResolvedValue(true)
				}))
			}));

			// Act
			await pickleBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: BOT_NAME,
					avatarURL: PICKLE_BOT_AVATAR_URL,
					content: PICKLE_BOT_RESPONSE
				})
			);
		});

		it('should NOT respond to unrelated messages', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.UNRELATED;

			// Act
			await pickleBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
