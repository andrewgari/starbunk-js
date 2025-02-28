// Import mocks first
import { createMockGuildMember, createMockMessage } from '../../mocks/discordMocks';
import { createMockWebhookService } from '../../mocks/serviceMocks';

// Mock the AllConditions class
jest.mock('../../../starbunk/bots/triggers/conditions/allConditions', () => {
	return {
		AllConditions: jest.fn().mockImplementation(() => {
			return {
				shouldTrigger: jest.fn().mockImplementation((message) => {
					// Return true if message contains "gremlin" (case insensitive)
					if (message.content && message.content.toLowerCase().includes('gremlin')) {
						return Promise.resolve(true);
					}

					// Return true if message is from Sig
					if (message.author && message.author.id === 'sig-user-id') {
						return Promise.resolve(true);
					}

					return Promise.resolve(false);
				})
			};
		})
	};
});

// Mock the UserCondition class
jest.mock('../../../starbunk/bots/triggers/conditions/userCondition', () => {
	return {
		UserCondition: jest.fn().mockImplementation(() => {
			return {
				shouldTrigger: jest.fn().mockResolvedValue(false)
			};
		})
	};
});

// Mock dependencies before importing the modules that use them
const mockWebhookService = createMockWebhookService();
jest.mock('../../../webhooks/webhookService', () => ({
	__esModule: true,
	default: mockWebhookService,
	WebhookService: jest.fn()
}));

// Mock the UserID for Sig
jest.mock('../../../discord/userID', () => ({
	Sig: 'sig-user-id'
}));

// Now import the modules that use the mocks
import { Message, TextChannel, User } from 'discord.js';
import createPickleBot from '../../../starbunk/bots/reply-bots/pickleBot';
import ReplyBot from '../../../starbunk/bots/replyBot';
import { patchReplyBot } from '../../helpers/replyBotHelper';

describe('PickleBot', () => {
	// Arrange - Setup variables
	let pickleBot: ReplyBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;

	beforeEach(() => {
		// Arrange - Reset and setup test environment
		mockWebhookService = createMockWebhookService();
		mockMessage = createMockMessage('TestUser');
		pickleBot = createPickleBot(mockWebhookService);
		patchReplyBot(pickleBot, mockWebhookService);
	});

	describe('bot configuration', () => {
		it('should have correct name', () => {
			// Act
			const identity = pickleBot.getIdentity();

			// Assert
			expect(identity.name).toBe('PickleBot');
		});

		it('should have correct avatar URL', () => {
			// Act
			const identity = pickleBot.getIdentity();

			// Assert
			expect(identity.avatarUrl).toBe('https://i.imgur.com/D0czJFu.jpg');
		});
	});

	describe('message handling', () => {
		const expectedResponse = "Could you repeat that? I don't speak *gremlin*";

		const expectedMessageOptions = {
			username: 'PickleBot',
			avatarURL: 'https://i.imgur.com/D0czJFu.jpg',
			content: expectedResponse,
			embeds: []
		};

		it('should ignore messages from bots', async () => {
			// Arrange
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			mockMessage.content = 'gremlin';

			// Act
			await pickleBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "gremlin"', async () => {
			// Arrange
			mockMessage.content = 'gremlin';

			// Act
			await pickleBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: expectedMessageOptions.username,
					avatarURL: expectedMessageOptions.avatarURL,
					content: expectedMessageOptions.content
				})
			);
		});

		it('should respond to "GREMLIN" (case insensitive)', async () => {
			// Arrange
			mockMessage.content = 'GREMLIN';

			// Act
			await pickleBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: expectedMessageOptions.username,
					avatarURL: expectedMessageOptions.avatarURL,
					content: expectedMessageOptions.content
				})
			);
		});

		it('should respond when "gremlin" is part of a sentence', async () => {
			// Arrange
			mockMessage.content = 'I am a gremlin sometimes';

			// Act
			await pickleBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: expectedMessageOptions.username,
					avatarURL: expectedMessageOptions.avatarURL,
					content: expectedMessageOptions.content
				})
			);
		});

		it('should respond to messages from Sig with random chance', async () => {
			// Arrange
			const mockSigMember = createMockGuildMember('sig-user-id', 'Sig');
			mockMessage.author = mockSigMember.user as User;
			Object.defineProperty(mockMessage.author, 'id', { value: 'sig-user-id', configurable: true });
			mockMessage.content = 'Just a normal message from Sig';

			// Mock the RandomChanceCondition to always return true for testing
			jest.mock('../../../starbunk/bots/triggers/conditions/randomChanceCondition', () => ({
				RandomChanceCondition: jest.fn().mockImplementation(() => ({
					shouldTrigger: jest.fn().mockResolvedValue(true)
				}))
			}));

			// Act
			await pickleBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: expectedMessageOptions.username,
					avatarURL: expectedMessageOptions.avatarURL,
					content: expectedMessageOptions.content
				})
			);
		});

		it('should NOT respond to unrelated messages', async () => {
			// Arrange
			mockMessage.content = 'Hello there!';

			// Act
			await pickleBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
