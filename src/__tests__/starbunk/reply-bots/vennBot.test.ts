import { patchReplyBot } from '@/__tests__/helpers/replyBotHelper';
import { createMockMessage } from '@/__tests__/mocks/discordMocks';
import { createMockWebhookService } from '@/__tests__/mocks/serviceMocks';
import userID from '@/discord/userID';
import createVennBot from '@/starbunk/bots/reply-bots/vennBot';
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
		mockMessage = createMockMessage('TestUser');

		// Create the bot with factory function
		vennBot = createVennBot(mockWebhookService);

		// Patch the bot for testing
		patchReplyBot(vennBot, mockWebhookService);

		// Clear mocks
		(Random.percentChance as jest.Mock).mockClear();
		jest.clearAllMocks();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('message handling', () => {
		const expectedMessageBase = {
			username: 'VennBot',
			avatarURL: 'https://cdn.discordapp.com/attachments/854790294253117531/902975839420497940/venn.png',
			embeds: []
		};

		it('should ignore messages from bots', async () => {
			mockMessage.author = createMockVennUser({ bot: true });
			await vennBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "venn" in messages', async () => {
			mockMessage.content = 'Did you see what venn did?';
			await vennBot.handleMessage(mockMessage as Message<boolean>);

			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expect.objectContaining({
					...expectedMessageBase,
					content: expect.any(String)
				})
			);
		});

		it('should respond to case-insensitive "VENN"', async () => {
			mockMessage.content = 'That VENN guy is awesome!';
			await vennBot.handleMessage(mockMessage as Message<boolean>);

			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expect.objectContaining({
					...expectedMessageBase,
					content: expect.any(String)
				})
			);
		});

		it('should not respond to messages without "venn"', async () => {
			mockMessage.content = 'Just a regular message';
			await vennBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "venn" at word boundaries', async () => {
			mockMessage.content = 'Hey venn!';
			await vennBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expect.objectContaining({
					...expectedMessageBase,
					content: expect.any(String)
				})
			);
		});

		describe('user random responses', () => {
			beforeEach(() => {
				mockMessage.author = createMockVennUser();
				(Random.percentChance as jest.Mock).mockReturnValue(false);
			});

			it('should randomly respond to Venn messages when chance is met', async () => {
				(Random.percentChance as jest.Mock).mockReturnValue(true);
				mockMessage.content = 'Just saying hello';

				await vennBot.handleMessage(mockMessage as Message<boolean>);

				expect(Random.percentChance).toHaveBeenCalledWith(5);
				expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
					mockMessage.channel,
					expect.objectContaining({
						...expectedMessageBase,
						content: expect.any(String)
					})
				);
			});

			it('should not respond to Venn when chance is not met', async () => {
				(Random.percentChance as jest.Mock).mockReturnValue(false);
				mockMessage.content = 'Just saying hello';

				await vennBot.handleMessage(mockMessage as Message<boolean>);

				expect(Random.percentChance).toHaveBeenCalledWith(5);
				expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
			});
		});
	});
});
