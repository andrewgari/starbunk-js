import { createMockMessage } from '@/test/mocks/discordMocks';
import { createMockWebhookService } from '@/test/mocks/serviceMocks';
import { Message, User } from 'discord.js';
import userID from '../../../../discord/userID';
import Random from '../../../../utils/random';
import VennBot from '../vennBot';

jest.mock('../../../../utils/random');

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

	beforeEach(() => {
		mockWebhookService = createMockWebhookService();
		mockMessage = {
			...createMockMessage('Venn'),
			author: createMockVennUser()
		};
		vennBot = new VennBot(mockWebhookService);
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

		it('should ignore messages from bots', () => {
			mockMessage.author = { ...mockMessage.author, bot: true } as User;
			vennBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to Venn saying "cringe"', () => {
			mockMessage.content = 'that was cringe';
			vennBot.handleMessage(mockMessage as Message<boolean>);

			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expect.objectContaining({
					username: 'Venn',
					avatarURL: 'venn-avatar-url',
					content: expect.any(String)
				})
			);
		});

		it('should respond to Venn\'s messages with 5% chance', () => {
			mockMessage.content = 'regular message';
			(Random.percentChance as jest.Mock).mockReturnValue(true);

			vennBot.handleMessage(mockMessage as Message<boolean>);

			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expect.objectContaining({
					username: 'Venn',
					avatarURL: 'venn-avatar-url'
				})
			);
		});

		it('should not respond to Venn\'s messages with 95% chance', () => {
			mockMessage.content = 'regular message';
			(Random.percentChance as jest.Mock).mockReturnValue(false);

			vennBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should use random responses', () => {
			mockMessage.content = 'cringe';
			const responses = new Set();

			for (let i = 0; i < 5; i++) {
				jest.spyOn(Random, 'roll').mockReturnValue(i);
				vennBot.handleMessage(mockMessage as Message<boolean>);
				const call = (mockWebhookService.writeMessage as jest.Mock).mock.calls[i];
				responses.add(call[1].content);
			}

			expect(responses.size).toBeGreaterThan(1);
		});

		it('should use default avatar URL if display avatar URL is not available', () => {
			mockMessage = {
				...mockMessage,
				content: 'cringe',
				author: createMockVennUser({
					displayAvatarURL: () => null
				})
			};

			vennBot.handleMessage(mockMessage as Message<boolean>);

			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expect.objectContaining({
					avatarURL: 'venn-default-avatar-url'
				})
			);
		});

		it('should not respond to non-Venn users saying cringe', () => {
			mockMessage.content = 'cringe';
			mockMessage.author = {
				...mockMessage.author,
				id: 'some-other-id'
			} as User;

			vennBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
