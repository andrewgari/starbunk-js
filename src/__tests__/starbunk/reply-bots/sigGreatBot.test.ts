import { patchReplyBot } from '@/__tests__/helpers/replyBotHelper';
import { createMockMessage } from '@/__tests__/mocks/discordMocks';
import { createMockWebhookService } from '@/__tests__/mocks/serviceMocks';
import SigBestBot from '@/starbunk/bots/reply-bots/sigGreatBot';
import ReplyBot from '@/starbunk/bots/replyBot';
import { Message, TextChannel, User } from 'discord.js';

describe('SigBestBot', () => {
	let sigBestBot: ReplyBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;

	beforeEach(() => {
		mockWebhookService = createMockWebhookService();
		mockMessage = createMockMessage();
		sigBestBot = new SigBestBot(mockWebhookService);

		// Patch the sendReply method for synchronous testing
		patchReplyBot(sigBestBot, mockWebhookService);

		jest.useRealTimers();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('message handling', () => {
		const expectedMessageOptions = {
			username: 'SigBestBot',
			avatarURL: '',
			content: 'Man, Sig really is the best.',
			embeds: []
		};

		it('should ignore messages from bots', async () => {
			mockMessage.author = {
				bot: true,
				id: '123',
				username: 'test',
				discriminator: '1234',
				avatar: 'test',
				system: false
			} as unknown as User;
			await sigBestBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "sig is best"', async () => {
			mockMessage.content = 'sig is best';
			await sigBestBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expectedMessageOptions
			);
		});

		it('should respond to "siggles is best"', async () => {
			mockMessage.content = 'siggles is best';
			await sigBestBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expectedMessageOptions
			);
		});
	});
});
