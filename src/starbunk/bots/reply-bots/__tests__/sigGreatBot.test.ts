import { createMockMessage } from '@/test/mocks/discordMocks';
import { createMockWebhookService } from '@/test/mocks/serviceMocks';
import { Message, User } from 'discord.js';
import SigBestBot from '../sigGreatBot';

describe('SigBestBot', () => {
	let sigBestBot: SigBestBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;

	beforeEach(() => {
		mockWebhookService = createMockWebhookService();
		mockMessage = createMockMessage();
		sigBestBot = new SigBestBot(mockWebhookService);
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
			} as unknown as User;
			sigBestBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "sig is best"', () => {
			mockMessage.content = 'sig is best';
			sigBestBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expectedMessageOptions
			);
		});

		it('should respond to "siggles is best"', () => {
			mockMessage.content = 'siggles is best';
			sigBestBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expectedMessageOptions
			);
		});
	});
});
