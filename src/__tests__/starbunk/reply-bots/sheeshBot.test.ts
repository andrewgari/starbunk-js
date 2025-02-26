import { Message, TextChannel, User, Webhook } from 'discord.js';
import { patchReplyBot } from '../../../__tests__/helpers/replyBotHelper';
import { createMockMessage, createMockTextChannel } from '../../../__tests__/mocks/discordMocks';
import createSheeshBot from '../../../starbunk/bots/reply-bots/sheeshBot';
import ReplyBot from '../../../starbunk/bots/replyBot';
import { WebhookService } from '../../../webhooks/webhookService';

describe('SheeshBot', () => {
	let sheeshBot: ReplyBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: jest.Mocked<WebhookService>;
	let mockChannel: TextChannel;
	let mockWebhook: Partial<Webhook>;

	beforeEach(() => {
		mockChannel = createMockTextChannel();
		mockWebhook = {
			id: 'mock-webhook-id',
			name: 'mock-webhook-name',
			send: jest.fn().mockResolvedValue({})
		};

		// Create a proper mock that extends WebhookService
		mockWebhookService = {
			getChannelWebhook: jest.fn().mockResolvedValue(mockWebhook as Webhook),
			getWebhookName: jest.fn().mockReturnValue('mock-webhook-name'),
			getWebhook: jest.fn().mockResolvedValue(mockWebhook as Webhook),
			writeMessage: jest.fn().mockImplementation(async (channel, message) => {
				const webhook = await mockWebhookService.getChannelWebhook(channel as TextChannel);
				return webhook.send(message) as Promise<Message<boolean>>;
			})
		} as unknown as jest.Mocked<WebhookService>;

		// Make the mock pass the instanceof check
		Object.setPrototypeOf(mockWebhookService, WebhookService.prototype);

		mockMessage = {
			...createMockMessage('TestUser'),
			channel: mockChannel
		};

		// Create the bot using the factory function with mockWebhookService
		sheeshBot = createSheeshBot(mockWebhookService);

		// Patch the bot to use our mock webhook service
		patchReplyBot(sheeshBot, mockWebhookService);

		jest.clearAllMocks();
	});

	describe('message handling', () => {
		const expectedMessageBase = {
			username: 'SheeshBot',
			avatarURL: 'https://i.kym-cdn.com/photos/images/newsfeed/002/297/355/cb3',
			embeds: []
		};

		it('should ignore messages from bots', async () => {
			const botMessage = {
				...createMockMessage('BotUser'),
				channel: mockChannel,
				author: {
					...createMockMessage('BotUser').author as User,
					bot: true
				} as User
			};
			await sheeshBot.handleMessage(botMessage as Message);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "sheesh"', async () => {
			mockMessage.content = 'sheesh';
			await sheeshBot.handleMessage(mockMessage as Message);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expect.objectContaining({
					...expectedMessageBase,
					content: expect.stringMatching(/^Sh[e]+sh$/)
				})
			);
		});

		it('should not respond to unrelated messages', async () => {
			mockMessage.content = 'hello world';
			await sheeshBot.handleMessage(mockMessage as Message);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should be case insensitive', async () => {
			const testCases = ['SHEESH', 'sHeEsH', 'ShEeSh'];

			for (const sheeshVariation of testCases) {
				mockMessage.content = sheeshVariation;
				await sheeshBot.handleMessage(mockMessage as Message);
				expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
					mockMessage.channel,
					expect.objectContaining({
						...expectedMessageBase,
						content: expect.stringMatching(/^Sh[e]+sh$/)
					})
				);
			}
		});
	});
});
