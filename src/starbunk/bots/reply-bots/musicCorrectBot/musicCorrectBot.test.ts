// Mocks need to be at the very top, before any imports
import { mockWebhookServiceDefault } from '@/tests/mocks/serviceMocks';
jest.mock('@/webhooks/webhookService', () => mockWebhookServiceDefault());

// Import the model constants
import { MUSIC_CORRECT_BOT_AVATAR_URL, MUSIC_CORRECT_BOT_RESPONSE, TEST } from './musicCorrectBotModel';

// Create variable to control mock behavior
let patternShouldTriggerResponse = TEST.CONDITIONS.TRIGGER;

// Mock the PatternCondition to control when patterns match
jest.mock('@/starbunk/bots/triggers/conditions/patternCondition', () => {
	return {
		PatternCondition: jest.fn().mockImplementation(() => ({
			shouldTrigger: jest.fn().mockImplementation(() => Promise.resolve(patternShouldTriggerResponse))
		}))
	};
});

// Real imports after all mocks
import { createMockGuildMember, createMockMessage } from '@/tests/mocks/discordMocks';
import webhookService from '@/webhooks/webhookService';
import { Message, TextChannel, User } from 'discord.js';
import ReplyBot from '../../replyBot';
import createMusicCorrectBot from './musicCorrectBot';

/**
 * Test suite for the MusicCorrectBot functionality
 *
 * The MusicCorrectBot responds to users who try to use old music commands (!play or ?play)
 * with a message informing them about the new /play command format.
 *
 * These tests verify:
 * 1. The bot has the correct identity (name and avatar)
 * 2. The bot correctly identifies when to respond to messages
 * 3. The bot sends the appropriate response message
 * 4. The bot ignores messages it shouldn't respond to
 */
describe('MusicCorrectBot', () => {
	// Test fixtures
	let musicCorrectBot: ReplyBot;
	let mockMessage: Partial<Message<boolean>>;

	beforeEach(() => {
		// Arrange - Common setup for all tests
		jest.clearAllMocks();

		// Reset pattern trigger response
		patternShouldTriggerResponse = TEST.CONDITIONS.TRIGGER;

		// Create message mock
		mockMessage = createMockMessage(TEST.USER.NAME);
		if (mockMessage.author) {
			Object.defineProperty(mockMessage.author, 'displayName', {
				value: TEST.USER.NAME,
				configurable: true
			});
		}

		// Create bot instance
		musicCorrectBot = createMusicCorrectBot();
	});

	describe('identity', () => {
		it('should have correct name and avatar URL', () => {
			// Act
			const identity = musicCorrectBot.getIdentity();

			// Assert
			expect(identity.name).toBe('Music Correct Bot');
			expect(identity.avatarUrl).toBe(MUSIC_CORRECT_BOT_AVATAR_URL);
		});
	});

	describe('message handling', () => {
		it('should ignore messages from bots', async () => {
			// Arrange
			const mockMember = createMockGuildMember(TEST.USER.BOT_ID, TEST.USER.BOT_NAME);
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			mockMessage.content = TEST.MESSAGE.PLAY_EXCLAMATION;

			// Act
			await musicCorrectBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "!play" commands', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.PLAY_EXCLAMATION;

			// Act
			await musicCorrectBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'Music Correct Bot',
					avatarURL: MUSIC_CORRECT_BOT_AVATAR_URL,
					content: MUSIC_CORRECT_BOT_RESPONSE
				})
			);
		});

		it('should respond to "?play" commands', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.PLAY_QUESTION;

			// Act
			await musicCorrectBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'Music Correct Bot',
					avatarURL: MUSIC_CORRECT_BOT_AVATAR_URL,
					content: MUSIC_CORRECT_BOT_RESPONSE
				})
			);
		});

		it('should respond to "-play" commands', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.PLAY_DASH;

			// Act
			await musicCorrectBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'Music Correct Bot',
					avatarURL: MUSIC_CORRECT_BOT_AVATAR_URL,
					content: MUSIC_CORRECT_BOT_RESPONSE
				})
			);
		});

		it('should respond to "+play" commands', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.PLAY_PLUS;

			// Act
			await musicCorrectBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'Music Correct Bot',
					avatarURL: MUSIC_CORRECT_BOT_AVATAR_URL,
					content: MUSIC_CORRECT_BOT_RESPONSE
				})
			);
		});

		it('should NOT respond to "/play" commands', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.PLAY_SLASH;
			patternShouldTriggerResponse = TEST.CONDITIONS.NO_TRIGGER;

			// Act
			await musicCorrectBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should NOT respond to unrelated messages', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.UNRELATED;
			patternShouldTriggerResponse = TEST.CONDITIONS.NO_TRIGGER;

			// Act
			await musicCorrectBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
