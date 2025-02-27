import { Message, TextChannel, User } from 'discord.js';
import { createMockGuildMember, createMockMessage } from '../../../__tests__/mocks/discordMocks';
import { createMockWebhookService } from '../../../__tests__/mocks/serviceMocks';
import createMusicCorrectBot from '../../../starbunk/bots/reply-bots/musicCorrectBot';
import ReplyBot from '../../../starbunk/bots/replyBot';
import { patchReplyBot } from '../../helpers/replyBotHelper';

describe('MusicCorrectBot', () => {
	let musicCorrectBot: ReplyBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;

	beforeEach(() => {
		mockWebhookService = createMockWebhookService();
		mockMessage = createMockMessage('TestUser');
		musicCorrectBot = createMusicCorrectBot(mockWebhookService);
		patchReplyBot(musicCorrectBot, mockWebhookService);
	});

	describe('bot configuration', () => {
		it('should have correct name', () => {
			const identity = musicCorrectBot.getIdentity();
			expect(identity.name).toBe('Music Correct Bot');
		});
	});

	describe('message handling', () => {
		it('should ignore messages from bots', async () => {
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			mockMessage.content = '!play some music';

			await musicCorrectBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "!play" command', async () => {
			mockMessage.content = '!play some music';

			await musicCorrectBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'Music Correct Bot',
					content: "Hey! The play command has changed. Use '/play' instead! 🎵"
				})
			);
		});

		it('should respond to "?play" command', async () => {
			mockMessage.content = '?play some music';

			await musicCorrectBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'Music Correct Bot',
					content: "Hey! The play command has changed. Use '/play' instead! 🎵"
				})
			);
		});

		it('should NOT respond to "play" without prefix', async () => {
			mockMessage.content = 'play some music';

			await musicCorrectBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should NOT respond to "!play" in the middle of a message', async () => {
			mockMessage.content = 'I want to !play some music';

			await musicCorrectBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should NOT respond to unrelated messages', async () => {
			mockMessage.content = 'Hello there!';

			await musicCorrectBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
