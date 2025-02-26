import { Guild, GuildMember, Message, TextChannel, User, Webhook } from 'discord.js';
import { createMockGuildMember, createMockMessage, createMockTextChannel } from '../../../__tests__/mocks/discordMocks';
import userID from '../../../discord/userID';
import GuyBot from '../../../starbunk/bots/reply-bots/guyBot';
import ReplyBot from '../../../starbunk/bots/replyBot';
import Random from '../../../utils/random';
import { WebhookService } from '../../../webhooks/webhookService';

// Mock the Random module for roll
jest.mock('../../../utils/random', () => ({
	roll: jest.fn().mockReturnValue(0)
}));

// Mock the crypto module
jest.mock('crypto', () => ({
	randomInt: jest.fn().mockReturnValue(50)
}));

describe('GuyBot', () => {
	let guyBot: ReplyBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: jest.Mocked<WebhookService>;
	let mockGuy: GuildMember;
	let mockChannel: TextChannel;
	let mockWebhook: Partial<Webhook>;
	let originalMathRandom: () => number;

	beforeEach(() => {
		// Store original Math.random
		originalMathRandom = Math.random;

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

		mockGuy = {
			...createMockGuildMember(userID.Guy, 'Guy'),
			nickname: 'Guy',
			displayName: 'Guy',
			avatarURL: () => 'guy-avatar-url',
			displayAvatarURL: () => 'guy-display-avatar-url'
		} as unknown as GuildMember;

		mockMessage = {
			...createMockMessage('Guy'),
			channel: mockChannel,
			guild: {
				members: {
					fetch: jest.fn().mockResolvedValue(mockGuy)
				}
			} as unknown as Guild
		};

		guyBot = new GuyBot(mockWebhookService);
		jest.clearAllMocks();
	});

	afterEach(() => {
		// Restore original Math.random
		Math.random = originalMathRandom;
	});

	describe('message handling', () => {
		beforeEach(() => {
			jest.spyOn(Random, 'roll').mockReturnValue(0);
		});

		it('should ignore messages from bots', async () => {
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			await guyBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to messages containing "guy"', async () => {
			mockMessage.content = 'hey guy what\'s up';
			await guyBot.handleMessage(mockMessage as Message<boolean>);

			expect(mockMessage.guild?.members.fetch).toHaveBeenCalledWith(userID.Guy);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expect.objectContaining({
					username: 'Guy',
					avatarURL: 'guy-avatar-url'
				})
			);
		});

		it('should respond to Guy\'s messages with 5% chance', async () => {
			mockMessage.content = 'regular message';
			mockMessage.author = { id: userID.Guy } as User;
			Math.random = jest.fn().mockReturnValue(0.02); // 2% chance, which is less than 5%

			await guyBot.handleMessage(mockMessage as Message<boolean>);

			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expect.objectContaining({
					username: 'Guy'
				})
			);
		});

		it('should not respond to Guy\'s messages with 95% chance', async () => {
			mockMessage.content = 'regular message';
			mockMessage.author = { id: userID.Guy } as User;
			Math.random = jest.fn().mockReturnValue(0.95); // 95% chance, which is greater than 5%

			await guyBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should use random responses', async () => {
			mockMessage.content = 'guy';
			const responses = new Set();

			for (let i = 0; i < 5; i++) {
				jest.spyOn(Random, 'roll').mockReturnValue(i);
				await guyBot.handleMessage(mockMessage as Message<boolean>);
				const call = (mockWebhookService.writeMessage as jest.Mock).mock.calls[i];
				responses.add(call[1].content);
			}

			expect(responses.size).toBeGreaterThan(1);
		});

		it('should use display name if nickname is not available', async () => {
			mockMessage.content = 'guy';
			mockGuy.nickname = null;

			await guyBot.handleMessage(mockMessage as Message<boolean>);

			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expect.objectContaining({
					username: 'Guy'
				})
			);
		});

		it('should use display avatar URL if avatar URL is not available', async () => {
			mockMessage.content = 'guy';
			mockGuy.avatarURL = () => null;

			await guyBot.handleMessage(mockMessage as Message<boolean>);

			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expect.objectContaining({
					avatarURL: 'guy-display-avatar-url'
				})
			);
		});
	});
});
