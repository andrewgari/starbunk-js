// Import mocks first
import { createMockGuildMember, createMockMessage } from '../../mocks/discordMocks';
import { createMockWebhookService } from '../../mocks/serviceMocks';

// Create mock service
const mockWebhookService = createMockWebhookService();

// Use doMock instead of mock to avoid hoisting issues
jest.doMock('../../../webhooks/webhookService', () => ({
	__esModule: true,
	default: mockWebhookService,
	WebhookService: jest.fn()
}));

jest.doMock('../../../starbunk/bots/triggers/conditions/patternCondition', () => {
	return {
		PatternCondition: jest.fn().mockImplementation(() => {
			return {
				shouldTrigger: jest.fn().mockImplementation((message) => {
					// Return true if message starts with !play or ?play
					if (message.content && (message.content.startsWith('!play') || message.content.startsWith('?play'))) {
						return Promise.resolve(true);
					}
					return Promise.resolve(false);
				})
			};
		})
	};
});

// Now import the modules that use the mocks
import { Message, TextChannel, User } from 'discord.js';
import createMusicCorrectBot from '../../../starbunk/bots/reply-bots/musicCorrectBot';
import ReplyBot from '../../../starbunk/bots/replyBot';
import { patchReplyBot } from '../../helpers/replyBotHelper';

describe('MusicCorrectBot', () => {
	// Arrange - Setup variables
	let musicCorrectBot: ReplyBot;
	let mockMessage: Partial<Message<boolean>>;

	beforeEach(() => {
		// Arrange - Reset and setup test environment
		jest.clearAllMocks();
		mockMessage = createMockMessage('TestUser');
		musicCorrectBot = createMusicCorrectBot(mockWebhookService);
		patchReplyBot(musicCorrectBot, mockWebhookService);
	});

	describe('bot configuration', () => {
		it('should have correct name', () => {
			// Act
			const identity = musicCorrectBot.getIdentity();

			// Assert
			expect(identity.name).toBe('Music Correct Bot');
		});

		it('should have correct avatar URL', () => {
			// Act
			const identity = musicCorrectBot.getIdentity();

			// Assert
			expect(identity.avatarUrl).toBe('https://i.imgur.com/v9XsyNc.png');
		});
	});

	describe('message handling', () => {
		const expectedResponse = "Hey! The play command has changed. Use '/play' instead! 🎵";

		const expectedMessageOptions = {
			username: 'Music Correct Bot',
			avatarURL: 'https://i.imgur.com/v9XsyNc.png',
			content: expectedResponse,
			embeds: []
		};

		it('should ignore messages from bots', async () => {
			// Arrange
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			mockMessage.content = '!play some music';

			// Act
			await musicCorrectBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "!play" command', async () => {
			// Arrange
			mockMessage.content = '!play some music';

			// Act
			await musicCorrectBot.handleMessage(mockMessage as Message<boolean>);

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

		it('should respond to "?play" command', async () => {
			// Arrange
			mockMessage.content = '?play some music';

			// Act
			await musicCorrectBot.handleMessage(mockMessage as Message<boolean>);

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

		it('should NOT respond to "play" without prefix', async () => {
			// Arrange
			mockMessage.content = 'play some music';

			// Act
			await musicCorrectBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should NOT respond to "!play" in the middle of a message', async () => {
			// Arrange
			mockMessage.content = 'I want to !play some music';

			// Act
			await musicCorrectBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should NOT respond to unrelated messages', async () => {
			// Arrange
			mockMessage.content = 'Hello there!';

			// Act
			await musicCorrectBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
