import { Message, TextChannel, User, Webhook } from 'discord.js';
import { createMockMessage, createMockTextChannel } from '../../../__tests__/mocks/discordMocks';
import UserID from '../../../discord/userID';
import { TriggerCondition } from '../../../starbunk/bots/botTypes';
import createPickleBot from '../../../starbunk/bots/reply-bots/pickleBot';
import ReplyBot from '../../../starbunk/bots/replyBot';
import { WebhookService } from '../../../webhooks/webhookService';

// Mock the trigger classes
jest.mock('../../../starbunk/bots/botTypes', () => {
	const originalModule = jest.requireActual('../../../starbunk/bots/botTypes');
	return {
		...originalModule,
		PatternTrigger: jest.fn().mockImplementation(() => ({
			shouldTrigger: jest.fn().mockImplementation(async (message: Message) =>
				Promise.resolve(/gremlin/i.test(message.content || ''))
			)
		})),
		UserRandomTrigger: jest.fn().mockImplementation((userId: string, chance: number) => ({
			shouldTrigger: jest.fn().mockImplementation(async (message: Message) =>
				Promise.resolve(message.author?.id === userId && Math.random() * 100 < chance)
			)
		})),
		CompositeTrigger: jest.fn().mockImplementation((triggers: TriggerCondition[]) => ({
			shouldTrigger: jest.fn().mockImplementation(async (message: Message) => {
				for (const trigger of triggers) {
					if (await trigger.shouldTrigger(message)) {
						return true;
					}
				}
				return false;
			})
		})),
		StaticResponse: jest.fn().mockImplementation((response: string) => ({
			generateResponse: jest.fn().mockResolvedValue(response)
		}))
	};
});

describe('PickleBot', () => {
	let pickleBot: ReplyBot;
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

		pickleBot = createPickleBot(mockWebhookService);
		jest.clearAllMocks();
	});

	describe('message handling', () => {
		it('should ignore messages from bots', async () => {
			const botMessage = {
				...createMockMessage('BotUser'),
				channel: mockChannel,
				author: {
					...createMockMessage('BotUser').author as User,
					bot: true
				} as User
			};
			await pickleBot.handleMessage(botMessage as Message);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "gremlin"', async () => {
			mockMessage.content = 'gremlin';
			await pickleBot.handleMessage(mockMessage as Message);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expect.objectContaining({
					username: 'GremlinBot',
					avatarURL: 'https://i.imgur.com/D0czJFu.jpg',
					content: "Could you repeat that? I don't speak *gremlin*"
				})
			);
		});

		it('should respond to case variations', async () => {
			mockMessage.content = 'GREMLIN';
			await pickleBot.handleMessage(mockMessage as Message);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expect.objectContaining({
					username: 'GremlinBot',
					avatarURL: 'https://i.imgur.com/D0czJFu.jpg',
					content: "Could you repeat that? I don't speak *gremlin*"
				})
			);
		});

		it('should respond to word within text', async () => {
			mockMessage.content = 'hello gremlin world';
			await pickleBot.handleMessage(mockMessage as Message);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expect.objectContaining({
					username: 'GremlinBot',
					avatarURL: 'https://i.imgur.com/D0czJFu.jpg',
					content: "Could you repeat that? I don't speak *gremlin*"
				})
			);
		});

		it('should respond to Sig messages randomly', async () => {
			// Mock Math.random to return predictable values
			const mockMath = Object.create(global.Math);
			mockMath.random = () => 0.1; // 10% chance, which is less than our 15% threshold
			global.Math = mockMath;

			const sigMessage = {
				...createMockMessage('Sig'),
				channel: mockChannel,
				author: {
					...createMockMessage('Sig').author as User,
					id: UserID.Sig
				} as User,
				content: 'any message'
			};

			await pickleBot.handleMessage(sigMessage as Message);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				sigMessage.channel,
				expect.objectContaining({
					username: 'GremlinBot',
					avatarURL: 'https://i.imgur.com/D0czJFu.jpg',
					content: "Could you repeat that? I don't speak *gremlin*"
				})
			);

			// Restore original Math
			global.Math = Object.create(global.Math);
		});

		it('should not respond to unrelated messages', async () => {
			mockMessage.content = 'hello world';
			await pickleBot.handleMessage(mockMessage as Message);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
