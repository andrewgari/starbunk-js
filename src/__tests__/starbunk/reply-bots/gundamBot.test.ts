import { Message, TextChannel } from 'discord.js';
import { createMockGuildMember, createMockMessage, createMockTextChannel } from '../../../__tests__/mocks/discordMocks';
import { createMockWebhookService } from '../../../__tests__/mocks/serviceMocks';
import GundamBot from '../../../starbunk/bots/reply-bots/gundamBot';
import ReplyBot from '../../../starbunk/bots/replyBot';
import { patchReplyBot } from '../../helpers/replyBotHelper';

describe('GundamBot', () => {
	let gundamBot: ReplyBot;
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
		gundamBot = new GundamBot(mockWebhookService);

		// Patch the bot for testing
		patchReplyBot(gundamBot, mockWebhookService);
	});

	describe('bot configuration', () => {
		it('should have correct name', () => {
			expect(gundamBot.getIdentity().name).toBe('GundamBot');
		});

		it('should have correct avatar URL', () => {
			expect(gundamBot.getIdentity().avatarUrl).toBe(
				'https://cdn.discordapp.com/attachments/854790294253117531/902975839584849930/gundam.png'
			);
		});
	});

	describe('message handling', () => {
		it('should ignore messages from bots', async () => {
			const botMessage = {
				...mockMessage,
				author: { ...createMockGuildMember('bot-id', 'BotUser').user, bot: true }
			};
			await gundamBot.handleMessage(botMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		describe('message response', () => {
			it('should respond to "gundam"', async () => {
				mockMessage.content = 'gundam';
				await gundamBot.handleMessage(mockMessage as Message<boolean>);
				expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
					mockChannel,
					expect.objectContaining({
						username: 'GundamBot',
						avatarURL: expect.any(String),
						content: expect.any(String)
					})
				);
			});

			it('should respond to "mecha"', async () => {
				mockMessage.content = 'I love mecha anime';
				await gundamBot.handleMessage(mockMessage as Message<boolean>);
				expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
					mockChannel,
					expect.objectContaining({
						username: 'GundamBot',
						avatarURL: expect.any(String),
						content: expect.any(String)
					})
				);
			});

			it('should respond to "robot"', async () => {
				mockMessage.content = 'Giant robot fights are cool';
				await gundamBot.handleMessage(mockMessage as Message<boolean>);
				expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
					mockChannel,
					expect.objectContaining({
						username: 'GundamBot',
						content: expect.any(String)
					})
				);
			});

			it('should not respond to unrelated messages', async () => {
				mockMessage.content = 'hello world';
				await gundamBot.handleMessage(mockMessage as Message<boolean>);
				expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
			});
		});
	});
});
