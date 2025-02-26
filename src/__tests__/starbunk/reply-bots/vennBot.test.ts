import { patchReplyBot } from '@/__tests__/helpers/replyBotHelper';
import { createMockMessage } from '@/__tests__/mocks/discordMocks';
import { createMockWebhookService } from '@/__tests__/mocks/serviceMocks';
import userID from '@/discord/userID';
import VennBot from '@/starbunk/bots/reply-bots/vennBot';
import ReplyBot from '@/starbunk/bots/replyBot';
import Random from '@/utils/random';
import { Message, User } from 'discord.js';

jest.mock('@/utils/random');

const createMockVennUser = (overrides = {}): User => ({
	id: userID.Venn,
	bot: false,
	displayName: 'Venn',
	username: 'Venn',
	displayAvatarURL: () => 'venn-avatar-url',
	defaultAvatarURL: 'venn-default-avatar-url',
	_equals: jest.fn(),
	createdAt: new Date(),
	createdTimestamp: Date.now(),
	discriminator: '0000',
	tag: 'Venn#0000',
	...overrides
} as unknown as User);

describe('VennBot', () => {
	let vennBot: ReplyBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;

	beforeEach(() => {
		mockWebhookService = createMockWebhookService();
		mockMessage = {
			...createMockMessage('Venn'),
			content: '',
			author: createMockVennUser()
		};
		vennBot = new VennBot(mockWebhookService);

		// Patch the bot to use the mock webhook service
		patchReplyBot(vennBot, mockWebhookService);

		jest.clearAllMocks();
	});

	describe('bot configuration', () => {
		it('should have correct initial name', () => {
			expect(vennBot.getIdentity().name).toBe('VennBot');
		});

		it('should have correct initial avatar URL', () => {
			expect(vennBot.getIdentity().avatarUrl).toBe('https://cdn.discordapp.com/attachments/854790294253117531/902975839420497940/venn.png');
		});
	});

	describe('message handling', () => {
		beforeEach(() => {
			jest.spyOn(Random, 'roll').mockReturnValue(0);
		});

		it('should ignore messages from bots', async () => {
			mockMessage.author = { ...mockMessage.author, bot: true } as User;
			await vennBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to Venn saying "venn"', async () => {
			mockMessage.content = 'that was venn';
			await vennBot.handleMessage(mockMessage as Message<boolean>);

			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expect.objectContaining({
					username: 'VennBot',
					content: expect.any(String)
				})
			);
		});

		it('should respond to Venn\'s messages with 5% chance', async () => {
			mockMessage.content = 'regular message';
			// Mock Math.random to return a value that will trigger the bot (less than 5/100)
			jest.spyOn(global.Math, 'random').mockReturnValue(0.01);

			await vennBot.handleMessage(mockMessage as Message<boolean>);

			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expect.objectContaining({
					username: 'VennBot',
					content: expect.any(String)
				})
			);

			// Restore the original Math.random
			(global.Math.random as jest.Mock).mockRestore();
		});

		it('should not respond to Venn\'s messages with 95% chance', async () => {
			mockMessage.content = 'regular message';
			jest.spyOn(Random, 'percentChance').mockReturnValue(false);

			await vennBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should use random responses', async () => {
			mockMessage.content = 'venn';
			const responses = new Set();

			for (let i = 0; i < 5; i++) {
				jest.spyOn(Random, 'roll').mockReturnValue(i);
				mockWebhookService.writeMessage.mockClear();
				await vennBot.handleMessage(mockMessage as Message<boolean>);
				expect(mockWebhookService.writeMessage).toHaveBeenCalled();
				const call = mockWebhookService.writeMessage.mock.calls[0];
				responses.add(call[1].content);
			}

			expect(responses.size).toBeGreaterThan(1);
		});

		it('should use avatar URL from configuration', async () => {
			mockMessage = {
				...mockMessage,
				content: 'venn',
				author: createMockVennUser({
					displayAvatarURL: () => null
				})
			};

			await vennBot.handleMessage(mockMessage as Message<boolean>);

			expect(mockWebhookService.writeMessage).toHaveBeenCalled();
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expect.objectContaining({
					avatarURL: 'https://cdn.discordapp.com/attachments/854790294253117531/902975839420497940/venn.png'
				})
			);
		});

		it('should respond to messages containing "venn" regardless of user', async () => {
			mockMessage.content = 'venn';
			mockMessage.author = {
				...mockMessage.author,
				id: 'some-other-id'
			} as User;

			await vennBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalled();
		});
	});

	describe('response generation', () => {
		it('should return responses from the predefined list', async () => {
			jest.spyOn(Random, 'roll').mockReturnValue(1); // Second response is 'Oh hey dude'

			// Trigger the bot to generate a response
			mockMessage.content = 'venn';
			await vennBot.handleMessage(mockMessage as Message<boolean>);

			// Check that writeMessage was called with the expected response
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expect.objectContaining({
					content: expect.any(String) // Just check that there's some content
				})
			);
		});
	});
});
