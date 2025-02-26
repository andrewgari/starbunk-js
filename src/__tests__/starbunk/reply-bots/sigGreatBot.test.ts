import { patchReplyBot } from '@/__tests__/helpers/replyBotHelper';
import { createMockMessage } from '@/__tests__/mocks/discordMocks';
import { createMockWebhookService } from '@/__tests__/mocks/serviceMocks';
import createSigGreatBot from '@/starbunk/bots/reply-bots/sigGreatBot';
import ReplyBot from '@/starbunk/bots/replyBot';
import { Message, TextChannel, User } from 'discord.js';

describe('SigGreatBot', () => {
	let sigGreatBot: ReplyBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;

	beforeEach(() => {
		mockWebhookService = createMockWebhookService();
		mockMessage = createMockMessage();

		// Create bot with the new factory function
		sigGreatBot = createSigGreatBot();

		// Patch the sendReply method for synchronous testing
		patchReplyBot(sigGreatBot, mockWebhookService);

		jest.useRealTimers();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('message handling', () => {
		const expectedMessageOptions = {
			username: 'SigGreatBot',
			avatarURL: 'https://static.wikia.nocookie.net/chrono/images/a/a5/Serge2.png',
			content: 'The greatest.',
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
			await sigGreatBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "sig best"', async () => {
			mockMessage.content = 'sig best';
			await sigGreatBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expectedMessageOptions
			);
		});

		it('should respond to "sig greatest"', async () => {
			mockMessage.content = 'sig greatest';
			await sigGreatBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expectedMessageOptions
			);
		});
	});
});
