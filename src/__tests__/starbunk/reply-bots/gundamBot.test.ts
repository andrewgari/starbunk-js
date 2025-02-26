import { Message, TextChannel, User } from 'discord.js';
import { createMockGuildMember, createMockMessage, createMockTextChannel } from '../../../__tests__/mocks/discordMocks';
import { createMockWebhookService } from '../../../__tests__/mocks/serviceMocks';
import createGundamBot from '../../../starbunk/bots/reply-bots/gundamBot';
import { patchReplyBot } from '../../helpers/replyBotHelper';

// Import the GundamBot class type
import { GundamBot } from '../../../starbunk/bots/reply-bots/gundamBot';

describe('GundamBot', () => {
	let gundamBot: GundamBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;
	let mockChannel: TextChannel;

	beforeEach(() => {
		mockWebhookService = createMockWebhookService();
		mockChannel = createMockTextChannel();
		mockMessage = {
			...createMockMessage('TestUser'),
			channel: mockChannel,
			content: ''
		};
		gundamBot = createGundamBot(mockWebhookService) as GundamBot;

		// Patch the bot for testing
		patchReplyBot(gundamBot, mockWebhookService);
	});

	describe('bot configuration', () => {
		it('should have correct name', () => {
			expect(gundamBot.botName).toBe('GundamBot');
		});

		it('should have correct avatar URL', () => {
			expect(gundamBot.avatarUrl).toBe(
				'https://a1.cdn.japantravel.com/photo/41317-179698/1440x960!/tokyo-unicorn-gundam-statue-in-odaiba-179698.jpg'
			);
		});
	});

	describe('message handling', () => {
		const expectedMessageOptions = {
			username: 'GundamBot',
			avatarURL: 'https://a1.cdn.japantravel.com/photo/41317-179698/1440x960!/tokyo-unicorn-gundam-statue-in-odaiba-179698.jpg',
			content: 'That\'s the famous Unicorn Robot, "Gandum". There, I said it.',
			embeds: []
		};

		it('should ignore messages from bots', async () => {
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			await gundamBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		describe('pattern matching', () => {
			it('should match "gundam"', () => {
				expect(gundamBot.shouldReplyToMessage('gundam')).toBe(true);
			});

			it('should match "gandam"', () => {
				expect(gundamBot.shouldReplyToMessage('gandam')).toBe(true);
			});

			it('should match case variations', () => {
				expect(gundamBot.shouldReplyToMessage('GUNDAM')).toBe(true);
			});

			it('should match word within text', () => {
				expect(gundamBot.shouldReplyToMessage('look at that gundam over there')).toBe(true);
			});

			it('should not match partial matches', () => {
				expect(gundamBot.shouldReplyToMessage('gundamium')).toBe(false);
			});
		});

		describe('response generation', () => {
			it('should return response for matching content', () => {
				expect(gundamBot.getResponseForMessage('gundam')).toBe('That\'s the famous Unicorn Robot, "Gandum". There, I said it.');
			});

			it('should return null for non-matching content', () => {
				expect(gundamBot.getResponseForMessage('hello world')).toBeNull();
			});
		});

		describe('message response', () => {
			it('should respond to "gundam"', async () => {
				mockMessage.content = 'gundam';
				await gundamBot.handleMessage(mockMessage as Message<boolean>);
				expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
					mockChannel,
					expectedMessageOptions
				);
			});

			it('should respond to "gandam"', async () => {
				mockMessage.content = 'gandam';
				await gundamBot.handleMessage(mockMessage as Message<boolean>);
				expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
					mockChannel,
					expectedMessageOptions
				);
			});

			it('should respond to case variations', async () => {
				mockMessage.content = 'GUNDAM';
				await gundamBot.handleMessage(mockMessage as Message<boolean>);
				expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
					mockChannel,
					expectedMessageOptions
				);
			});

			it('should respond to word within text', async () => {
				mockMessage.content = 'look at that gundam over there';
				await gundamBot.handleMessage(mockMessage as Message<boolean>);
				expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
					mockChannel,
					expectedMessageOptions
				);
			});

			it('should not respond to partial matches', async () => {
				mockMessage.content = 'gundamium';
				await gundamBot.handleMessage(mockMessage as Message<boolean>);
				expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
			});

			it('should not respond to unrelated messages', async () => {
				mockMessage.content = 'hello world';
				await gundamBot.handleMessage(mockMessage as Message<boolean>);
				expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
			});
		});
	});
});
