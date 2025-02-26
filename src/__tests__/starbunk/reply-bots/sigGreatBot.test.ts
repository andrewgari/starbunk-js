import { patchReplyBot } from '@/__tests__/helpers/replyBotHelper';
import { createMockMessage } from '@/__tests__/mocks/discordMocks';
import { createMockWebhookService } from '@/__tests__/mocks/serviceMocks';
import SigGreatBot from '@/starbunk/bots/reply-bots/sigGreatBot';
import { Message, TextChannel, User } from 'discord.js';

describe('SigBestBot', () => {
	let sigBestBot: SigGreatBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;

	beforeEach(() => {
		mockWebhookService = createMockWebhookService();
		mockMessage = createMockMessage();
		sigBestBot = new SigGreatBot(mockWebhookService);

		// Patch the sendReply method for synchronous testing
		patchReplyBot(sigBestBot, mockWebhookService);

		jest.useRealTimers();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('bot configuration', () => {
		it('should have correct name', () => {
			expect(sigBestBot.getBotName()).toBe('SigBestBot');
		});

		it('should have correct avatar URL', () => {
			expect(sigBestBot.getAvatarUrl()).toBe('');
		});
	});

	describe('message handling', () => {
		const expectedMessageOptions = {
			username: 'SigBestBot',
			avatarURL: '',
			content: 'Man, Sig really is the best.',
			embeds: []
		};

		it('should ignore messages from bots', () => {
			mockMessage.author = {
				bot: true,
				id: '123',
				username: 'test',
				discriminator: '1234',
				avatar: 'test',
				system: false
			} as unknown as User;
			sigBestBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "sig is best"', () => {
			mockMessage.content = 'sig is best';
			sigBestBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expectedMessageOptions
			);
		});

		it('should respond to "siggles is best"', () => {
			mockMessage.content = 'siggles is best';
			sigBestBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expectedMessageOptions
			);
		});
	});
});
