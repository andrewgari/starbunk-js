// Import mocks first
import { createMockGuildMember, createMockMessage } from '../../mocks/discordMocks';
import { createMockWebhookService } from '../../mocks/serviceMocks';

// Create mock service
const mockWebhookService = createMockWebhookService();

/**
 * Mock the webhook service to avoid actual Discord API calls during tests
 */
jest.doMock('../../../webhooks/webhookService', () => ({
	__esModule: true,
	default: mockWebhookService,
	WebhookService: jest.fn()
}));

/**
 * Mock the pattern condition to simulate the trigger behavior
 * This allows us to test the bot's response without relying on the actual pattern matching logic
 */
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

	/**
	 * Tests for the bot's identity configuration
	 */
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

	/**
	 * Tests for the bot's message handling functionality
	 */
	describe('message handling', () => {
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
			mockMessage.content = '!play despacito';
			mockMessage.author = { id: '123456789' } as User;

			const expectedMessageOptions = {
				username: 'Music Correct Bot',
				avatarURL: 'https://i.imgur.com/v9XsyNc.png',
				content: `Hey Buddy.
I see you're trying to activate the music bot... I get it, I love to jam it out from time to time. But hey, let me fill you in on a little insider secret.
Ya see, the bot's gone through even **more** *changes* lately (Yeah, Yeah, I know. It keeps on changing how can my tiny brain keep up :unamused:). What *used* to be \`?play\` or \`!play\` has been updated to the shiny new command \`/play\`.
I know! It's that simple, so if you want to jam it out with your buds or just wanna troll them with some stupid video of a gross man in dirty underpants farting on his roomate's door or .... just the sound of a fart with a little extra revery (I dunno, I'm not judging :shrug:) you can call on me anytime with some youtube link.`,
				embeds: []
			};

			// Act
			await musicCorrectBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: expectedMessageOptions.username,
					avatarURL: expectedMessageOptions.avatarURL,
					content: expectedMessageOptions.content,
					embeds: expectedMessageOptions.embeds
				})
			);
		});

		it('should respond to "?play" command', async () => {
			// Arrange
			mockMessage.content = '?play despacito';
			mockMessage.author = { id: '123456789' } as User;

			const expectedMessageOptions = {
				username: 'Music Correct Bot',
				avatarURL: 'https://i.imgur.com/v9XsyNc.png',
				content: `Hey Buddy.
I see you're trying to activate the music bot... I get it, I love to jam it out from time to time. But hey, let me fill you in on a little insider secret.
Ya see, the bot's gone through even **more** *changes* lately (Yeah, Yeah, I know. It keeps on changing how can my tiny brain keep up :unamused:). What *used* to be \`?play\` or \`!play\` has been updated to the shiny new command \`/play\`.
I know! It's that simple, so if you want to jam it out with your buds or just wanna troll them with some stupid video of a gross man in dirty underpants farting on his roomate's door or .... just the sound of a fart with a little extra revery (I dunno, I'm not judging :shrug:) you can call on me anytime with some youtube link.`,
				embeds: []
			};

			// Act
			await musicCorrectBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: expectedMessageOptions.username,
					avatarURL: expectedMessageOptions.avatarURL,
					content: expectedMessageOptions.content,
					embeds: expectedMessageOptions.embeds
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
