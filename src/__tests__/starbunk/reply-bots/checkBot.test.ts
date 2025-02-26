import { Message, User } from 'discord.js';
import { createMockGuildMember, createMockMessage } from '../../../__tests__/mocks/discordMocks';
import { createMockWebhookService } from '../../../__tests__/mocks/serviceMocks';
import CheckBot from '../../../starbunk/bots/reply-bots/checkBot';
import { patchReplyBot } from '@/__tests__/helpers/replyBotHelper';

describe('CheckBot', () => {
	let checkBot: CheckBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;

	beforeEach(() => {
		mockWebhookService = createMockWebhookService();
		mockMessage = createMockMessage('TestUser');
		checkBot = new CheckBot(mockWebhookService);

		// Patch the sendReply method for synchronous testing
		patchReplyBot(checkBot, mockWebhookService);
	});

	describe('bot configuration', () => {
		it('should have correct name', () => {
			expect(checkBot.getBotName()).toBe('CheckBot');
		});

		it('should have correct avatar URL', () => {
			expect(checkBot.getAvatarUrl()).toBe('https://m.media-amazon.com/images/I/21Unzn9U8sL._AC_.jpg');
		});
	});

	describe('message handling', () => {
		const czechMessageOptions = {
			username: 'CheckBot',
			avatarURL: 'https://m.media-amazon.com/images/I/21Unzn9U8sL._AC_.jpg',
			content: "I believe you mean 'check'.",
			embeds: []
		};

		const chezhMessageOptions = {
			username: 'CheckBot',
			avatarURL: 'https://m.media-amazon.com/images/I/21Unzn9U8sL._AC_.jpg',
			content: "I believe you mean 'czech'.",
			embeds: []
		};

		it('should ignore messages from bots', () => {
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			checkBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "czech"', () => {
			mockMessage.content = 'czech';
			checkBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				czechMessageOptions
			);
		});

		it('should respond to "chezh"', () => {
			mockMessage.content = 'chezh';
			checkBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				chezhMessageOptions
			);
		});

		it('should respond to case variations of czech', () => {
			mockMessage.content = 'CZECH';
			checkBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				czechMessageOptions
			);
		});

		it('should respond to case variations of chezh', () => {
			mockMessage.content = 'CHEZH';
			checkBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				chezhMessageOptions
			);
		});

		it('should respond to word "czech" within text', () => {
			mockMessage.content = 'please czech this out';
			checkBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				czechMessageOptions
			);
		});

		it('should respond to word "chezh" within text', () => {
			mockMessage.content = 'please chezh this out';
			checkBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				chezhMessageOptions
			);
		});

		it('should not respond to partial matches', () => {
			mockMessage.content = 'czechoslovakia';
			checkBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should not respond to unrelated messages', () => {
			mockMessage.content = 'hello world';
			checkBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
