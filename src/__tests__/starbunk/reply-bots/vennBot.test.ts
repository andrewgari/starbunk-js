import { createMockMessage } from '@/__tests__/mocks/discordMocks';
import { createMockWebhookService } from '@/__tests__/mocks/serviceMocks';
import userID from '@/discord/userID';
import VennBot from '@/starbunk/bots/reply-bots/vennBot';
import Random from '@/utils/random';
import { Message, User } from 'discord.js';

jest.mock('@/utils/random');

const createMockVennUser = (overrides = {}): User => ({
	id: userID.Venn,
	bot: false,
	displayName: 'Venn',
	displayAvatarURL: () => 'venn-avatar-url',
	defaultAvatarURL: 'venn-default-avatar-url',
	_equals: jest.fn(),
	createdAt: new Date(),
	createdTimestamp: Date.now(),
	username: 'Venn',
	discriminator: '0000',
	tag: 'Venn#0000',
	...overrides
} as unknown as User);

describe('VennBot', () => {
	let vennBot: VennBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;
	let sendReplySpy: jest.SpyInstance;

	beforeEach(() => {
		mockWebhookService = createMockWebhookService();
		mockMessage = {
			...createMockMessage('Venn'),
			author: createMockVennUser()
		};
		vennBot = new VennBot(mockWebhookService);
		sendReplySpy = jest.spyOn(vennBot, 'sendReply').mockResolvedValue();
		jest.clearAllMocks();
	});

	describe('bot configuration', () => {
		it('should have correct initial name', () => {
			expect(vennBot.getBotName()).toBe('VennBot');
		});

		it('should have empty initial avatar URL', () => {
			expect(vennBot.getAvatarUrl()).toBe('');
		});
	});

	describe('message handling', () => {
		beforeEach(() => {
			jest.spyOn(Random, 'roll').mockReturnValue(0);
		});

		it('should ignore messages from bots', async () => {
			mockMessage.author = { ...mockMessage.author, bot: true } as User;
			await vennBot.handleMessage(mockMessage as Message<boolean>);
			expect(sendReplySpy).not.toHaveBeenCalled();
		});

		it('should respond to Venn saying "cringe"', async () => {
			mockMessage.content = 'that was cringe';
			await vennBot.handleMessage(mockMessage as Message<boolean>);

			expect(sendReplySpy).toHaveBeenCalledWith(
				mockMessage.channel,
				expect.any(String)
			);
			// Verify the bot name and avatar were updated
			expect(vennBot.getBotName()).toBe('Venn');
			expect(vennBot.getAvatarUrl()).toBe('venn-avatar-url');
		});

		it('should respond to Venn\'s messages with 5% chance', async () => {
			mockMessage.content = 'regular message';
			(Random.percentChance as jest.Mock).mockReturnValue(true);

			await vennBot.handleMessage(mockMessage as Message<boolean>);

			expect(sendReplySpy).toHaveBeenCalledWith(
				mockMessage.channel,
				expect.any(String)
			);
			// Verify the bot name and avatar were updated
			expect(vennBot.getBotName()).toBe('Venn');
			expect(vennBot.getAvatarUrl()).toBe('venn-avatar-url');
		});

		it('should not respond to Venn\'s messages with 95% chance', async () => {
			mockMessage.content = 'regular message';
			(Random.percentChance as jest.Mock).mockReturnValue(false);

			await vennBot.handleMessage(mockMessage as Message<boolean>);
			expect(sendReplySpy).not.toHaveBeenCalled();
		});

		it('should use random responses', async () => {
			mockMessage.content = 'cringe';
			const responses = new Set();

			for (let i = 0; i < 5; i++) {
				jest.spyOn(Random, 'roll').mockReturnValue(i);
				sendReplySpy.mockClear();
				await vennBot.handleMessage(mockMessage as Message<boolean>);
				expect(sendReplySpy).toHaveBeenCalled();
				const call = sendReplySpy.mock.calls[0];
				responses.add(call[1]);
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

			expect(sendReplySpy).toHaveBeenCalled();
			// Verify the avatar was set to the default
			expect(vennBot.getAvatarUrl()).toBe('venn-default-avatar-url');
		});

		it('should not respond to non-Venn users saying cringe', async () => {
			mockMessage.content = 'cringe';
			mockMessage.author = {
				...mockMessage.author,
				id: 'some-other-id'
			} as User;

			await vennBot.handleMessage(mockMessage as Message<boolean>);
			expect(sendReplySpy).not.toHaveBeenCalled();
		});
	});
});
