import { patchReplyBot } from '@/__tests__/helpers/replyBotHelper';
import { createMockMessage } from '@/__tests__/mocks/discordMocks';
import { createMockWebhookService } from '@/__tests__/mocks/serviceMocks';
import userID from '@/discord/userID';
import createVennBot, { getRandomResponse } from '@/starbunk/bots/reply-bots/vennBot';
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
		vennBot = createVennBot(mockWebhookService);

		// Patch the bot to use the mock webhook service
		patchReplyBot(vennBot, mockWebhookService);

		jest.clearAllMocks();
	});

	describe('bot configuration', () => {
		it('should have correct initial name', () => {
			expect(vennBot.getIdentity().name).toBe('VennBot');
		});

		it('should have empty initial avatar URL', () => {
			expect(vennBot.getIdentity().avatarUrl).toBe('');
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

		it('should respond to Venn saying "cringe"', async () => {
			mockMessage.content = 'that was cringe';
			await vennBot.handleMessage(mockMessage as Message<boolean>);

			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expect.objectContaining({
					username: 'Venn',
					avatarURL: 'venn-avatar-url',
					content: expect.any(String)
				})
			);

			// Verify the identity was updated
			expect(vennBot.getIdentity().name).toBe('Venn');
			expect(vennBot.getIdentity().avatarUrl).toBe('venn-avatar-url');
		});

		it('should respond to Venn\'s messages with 5% chance', async () => {
			mockMessage.content = 'regular message';
			(Random.percentChance as jest.Mock).mockReturnValue(true);

			await vennBot.handleMessage(mockMessage as Message<boolean>);

			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expect.objectContaining({
					username: 'Venn',
					avatarURL: 'venn-avatar-url'
				})
			);

			// Verify the identity was updated
			expect(vennBot.getIdentity().name).toBe('Venn');
			expect(vennBot.getIdentity().avatarUrl).toBe('venn-avatar-url');
		});

		it('should not respond to Venn\'s messages with 95% chance', async () => {
			mockMessage.content = 'regular message';
			(Random.percentChance as jest.Mock).mockReturnValue(false);

			await vennBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should use random responses', async () => {
			mockMessage.content = 'cringe';
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

		it('should use default avatar URL if display avatar URL is not available', async () => {
			mockMessage = {
				...mockMessage,
				content: 'cringe',
				author: createMockVennUser({
					displayAvatarURL: () => null
				})
			};

			await vennBot.handleMessage(mockMessage as Message<boolean>);

			expect(mockWebhookService.writeMessage).toHaveBeenCalled();
			// Verify the avatar was set to the default
			expect(vennBot.getIdentity().avatarUrl).toBe('venn-default-avatar-url');
		});

		it('should not respond to non-Venn users saying cringe', async () => {
			mockMessage.content = 'cringe';
			mockMessage.author = {
				...mockMessage.author,
				id: 'some-other-id'
			} as User;

			await vennBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});
	});

	describe('getRandomResponse', () => {
		it('should return a random response from the list', () => {
			jest.spyOn(Random, 'roll').mockReturnValue(0);
			const response = getRandomResponse();
			expect(response).toBe('Sorry, but that was über cringe...');
		});
	});
});
