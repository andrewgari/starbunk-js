import { Message, TextChannel, User, Webhook } from 'discord.js';
import { patchReplyBot } from '../../../__tests__/helpers/replyBotHelper';
import { createMockMessage, createMockTextChannel } from '../../../__tests__/mocks/discordMocks';
import createGuyBot from '../../../starbunk/bots/reply-bots/guyBot';
import ReplyBot from '../../../starbunk/bots/replyBot';
import { WebhookService } from '../../../webhooks/webhookService';

describe('GuyBot', () => {
	let guyBot: ReplyBot;
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

		// Create the bot using the factory function
		guyBot = createGuyBot();

		// Patch the bot to use our mock webhook service
		patchReplyBot(guyBot, mockWebhookService);

		jest.clearAllMocks();
	});

	describe('message handling', () => {
		const expectedMessageBase = {
			username: 'GuyBot',
			avatarURL: 'https://i.pinimg.com/originals/dc/39/85/dc3985a3ac127397c53bf8c3a749b011.jpg',
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
			await guyBot.handleMessage(botMessage as Message);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to messages containing "guy"', async () => {
			mockMessage.content = 'hey guy what\'s up';
			await guyBot.handleMessage(mockMessage as Message<boolean>);

			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expect.objectContaining({
					...expectedMessageBase,
					content: expect.stringMatching(/^I'm not your guy, /)
				})
			);
		});

		it('should not respond to unrelated messages', async () => {
			mockMessage.content = 'hello world';
			await guyBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
