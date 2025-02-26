import { Message, TextChannel } from 'discord.js';
import { createMockGuildMember, createMockMessage, createMockTextChannel } from '../../../__tests__/mocks/discordMocks';
import { createMockWebhookService } from '../../../__tests__/mocks/serviceMocks';
import createGundamBot from '../../../starbunk/bots/reply-bots/gundamBot';
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
		// Use factory function with mock webhook service
		gundamBot = createGundamBot(mockWebhookService);

		// Patch the bot for testing
		patchReplyBot(gundamBot, mockWebhookService);
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
