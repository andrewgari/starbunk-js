import { patchReplyBot } from '@/__tests__/helpers/replyBotHelper';
import { createMockMessage } from '@/__tests__/mocks/discordMocks';
import { createMockWebhookService } from '@/__tests__/mocks/serviceMocks';
import createMusicCorrectBot from '@/starbunk/bots/reply-bots/musicCorrectBot';
import ReplyBot from '@/starbunk/bots/replyBot';
import { Message, User } from 'discord.js';

describe('MusicCorrectBot', () => {
	let musicCorrectBot: ReplyBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;

	beforeEach(() => {
		mockWebhookService = createMockWebhookService();
		mockMessage = createMockMessage('');
		musicCorrectBot = createMusicCorrectBot(mockWebhookService);

		// Patch the sendReply method for synchronous testing
		patchReplyBot(musicCorrectBot, mockWebhookService);
	});

	describe('bot configuration', () => {
		it('should have correct name', () => {
			expect(musicCorrectBot.getIdentity().name).toBe('Music Correct Bot');
		});
	});

	describe('message handling', () => {
		const expectedMessageOptions = {
			username: 'Music Correct Bot',
			avatarURL: '',
			content: "Hey! The play command has changed. Use '/play' instead! 🎵",
			embeds: []
		};

		it('should ignore messages from bots', async () => {
			mockMessage.author = {
				bot: true,
				id: '123',
				username: 'test',
				discriminator: '1234',
				avatar: 'test',
				system: false
			} as unknown as User;
			await musicCorrectBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "!play"', async () => {
			mockMessage.content = '!play something';
			await musicCorrectBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expectedMessageOptions
			);
		});

		it('should respond to "?play"', async () => {
			mockMessage.content = '?play something';
			await musicCorrectBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expectedMessageOptions
			);
		});

		it('should not respond to "/play"', async () => {
			mockMessage.content = '/play something';
			await musicCorrectBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should not respond to messages without play commands', async () => {
			mockMessage.content = 'hello world';
			await musicCorrectBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to play commands with various arguments', async () => {
			mockMessage.content = '!play https://youtube.com/something';
			await musicCorrectBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expectedMessageOptions
			);
		});
	});
});
