import { createMockMessage } from '@/__tests__/mocks/discordMocks';
import { createMockWebhookService } from '@/__tests__/mocks/serviceMocks';
import NiceBot from '@/starbunk/bots/reply-bots/niceBot';
import { Message } from 'discord.js';

describe('NiceBot', () => {
	let niceBot: NiceBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;

	beforeEach(() => {
		mockWebhookService = createMockWebhookService();
		mockMessage = createMockMessage('TestUser');
		niceBot = new NiceBot(mockWebhookService);
	});

	describe('bot configuration', () => {
		it('should have correct name', () => {
			expect(niceBot.getBotName()).toBe('BunkBot');
		});

		it('should have correct avatar URL', () => {
			expect(niceBot.getAvatarUrl()).toBe('https://pbs.twimg.com/profile_images/421461637325787136/0rxpHzVx.jpeg');
		});
	});

	describe('message handling', () => {
		const expectedMessageOptions: {
			username: string;
			avatarURL: string;
			content: string;
			embeds: never[];
		} = {
			username: 'BunkBot',
			avatarURL: 'https://pbs.twimg.com/profile_images/421461637325787136/0rxpHzVx.jpeg',
			content: 'Nice.',
			embeds: []
		};

		it('should respond to "69"', () => {
			mockMessage.content = '69';
			niceBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expectedMessageOptions
			);
		});

		it('should respond to "sixty-nine"', () => {
			mockMessage.content = 'sixty-nine';
			niceBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expectedMessageOptions
			);
		});

		it('should respond to "sixtynine"', () => {
			mockMessage.content = 'sixtynine';
			niceBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expectedMessageOptions
			);
		});

		it('should not respond to unrelated messages', () => {
			mockMessage.content = 'hello world';
			niceBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
