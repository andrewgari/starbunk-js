import { patchReplyBot } from '@/__tests__/helpers/replyBotHelper';
import { Message } from 'discord.js';
import { createMockMessage } from '../../../__tests__/mocks/discordMocks';
import { createMockWebhookService } from '../../../__tests__/mocks/serviceMocks';
import createNiceBot from '../../../starbunk/bots/reply-bots/niceBot';
import ReplyBot from '../../../starbunk/bots/replyBot';

describe('NiceBot', () => {
	let niceBot: ReplyBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;

	beforeEach(() => {
		mockWebhookService = createMockWebhookService();
		mockMessage = createMockMessage('TestUser');
		mockMessage.author = { ...mockMessage.author, bot: false } as Message['author'];
		niceBot = createNiceBot(mockWebhookService);

		// Patch the sendReply method for synchronous testing
		patchReplyBot(niceBot, mockWebhookService);
	});

	describe('bot configuration', () => {
		it('should have correct name', () => {
			const identity = niceBot.getIdentity();
			expect(identity.name).toBe('BunkBot');
		});

		it('should have correct avatar URL', () => {
			const identity = niceBot.getIdentity();
			expect(identity.avatarUrl).toBe('https://pbs.twimg.com/profile_images/421461637325787136/0rxpHzVx.jpeg');
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

		it('should respond to "69"', async () => {
			mockMessage.content = '69';
			await niceBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expectedMessageOptions
			);
		});

		it('should respond to "sixty-nine"', async () => {
			mockMessage.content = 'sixty-nine';
			await niceBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expectedMessageOptions
			);
		});

		it('should respond to "sixtynine"', async () => {
			mockMessage.content = 'sixtynine';
			await niceBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expectedMessageOptions
			);
		});

		it('should not respond to unrelated messages', async () => {
			mockMessage.content = 'hello world';
			await niceBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
