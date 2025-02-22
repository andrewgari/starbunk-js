import MusicCorrectBot from '@/starbunk/bots/reply-bots/musicCorrectBot';
import { createMockMessage } from '@/tests/mocks/discordMocks';
import { createMockWebhookService } from '@/tests/mocks/serviceMocks';
import { Message, User } from 'discord.js';

describe('MusicCorrectBot', () => {
	let musicCorrectBot: MusicCorrectBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;

	beforeEach(() => {
		mockWebhookService = createMockWebhookService();
		mockMessage = createMockMessage();
		musicCorrectBot = new MusicCorrectBot(mockWebhookService);
	});


	describe('bot configuration', () => {
		it('should have correct name', () => {
			expect(musicCorrectBot.getBotName()).toBe('Music Correct Bot');
		});
	});

	describe('message handling', () => {
		const expectedMessageOptions = {
			username: 'Music Correct Bot',
			avatarURL: '',
			content: "Hey! The play command has changed. Use '/play' instead! 🎵",
			embeds: []
		};

		it('should ignore messages from bots', () => {
			mockMessage.author = {
				bot: true,
				id: '123',
				username: 'test',
				discriminator: '1234',
				avatar: 'test',
				system: false
			} as unknown as User;
			musicCorrectBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "!play"', () => {
			mockMessage.content = '!play something';
			musicCorrectBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expectedMessageOptions
			);
		});

		it('should respond to "?play"', () => {
			mockMessage.content = '?play something';
			musicCorrectBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expectedMessageOptions
			);
		});

		it('should not respond to "/play"', () => {
			mockMessage.content = '/play something';
			musicCorrectBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should not respond to messages without play commands', () => {
			mockMessage.content = 'hello world';
			musicCorrectBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to play commands with various arguments', () => {
			mockMessage.content = '!play https://youtube.com/something';
			musicCorrectBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expectedMessageOptions
			);
		});
	});
});
