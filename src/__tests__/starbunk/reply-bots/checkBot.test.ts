import { Message, TextChannel, User } from 'discord.js';
import { createMockGuildMember, createMockMessage } from '../../../__tests__/mocks/discordMocks';
import { createMockWebhookService } from '../../../__tests__/mocks/serviceMocks';
import createCheckBot from '../../../starbunk/bots/reply-bots/checkBot';
import ReplyBot from '../../../starbunk/bots/replyBot';
import { patchReplyBot } from '../../helpers/replyBotHelper';

describe('CheckBot', () => {
	let checkBot: ReplyBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;

	beforeEach(() => {
		mockWebhookService = createMockWebhookService();
		mockMessage = createMockMessage('TestUser');
		checkBot = createCheckBot(mockWebhookService);
		patchReplyBot(checkBot, mockWebhookService);
	});

	describe('bot configuration', () => {
		it('should have correct name', () => {
			const identity = checkBot.getIdentity();
			expect(identity.name).toBe('CheckBot');
		});

		it('should have correct avatar URL', () => {
			const identity = checkBot.getIdentity();
			expect(identity.avatarUrl).toBe('https://m.media-amazon.com/images/I/21Unzn9U8sL._AC_.jpg');
		});
	});

	describe('message handling', () => {
		it('should ignore messages from bots', async () => {
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			mockMessage.content = 'czech';

			await checkBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "czech" with correction to "check"', async () => {
			mockMessage.content = 'czech';

			await checkBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'CheckBot',
					avatarURL: 'https://m.media-amazon.com/images/I/21Unzn9U8sL._AC_.jpg',
					content: "I believe you mean 'check' :wink:"
				})
			);
		});

		it('should respond to "czech" in a sentence', async () => {
			mockMessage.content = 'I am going to czech republic';

			await checkBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'CheckBot',
					avatarURL: 'https://m.media-amazon.com/images/I/21Unzn9U8sL._AC_.jpg',
					content: "I believe you mean 'check' :wink:"
				})
			);
		});

		it('should respond to "check" with correction to "czech"', async () => {
			mockMessage.content = 'check';

			await checkBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'CheckBot',
					avatarURL: 'https://m.media-amazon.com/images/I/21Unzn9U8sL._AC_.jpg',
					content: "I believe you mean 'czech' :wink:"
				})
			);
		});

		it('should respond to "check" in a sentence', async () => {
			mockMessage.content = 'Let me check that for you';

			await checkBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'CheckBot',
					avatarURL: 'https://m.media-amazon.com/images/I/21Unzn9U8sL._AC_.jpg',
					content: "I believe you mean 'czech' :wink:"
				})
			);
		});

		it('should NOT respond to unrelated messages', async () => {
			mockMessage.content = 'Hello there!';

			await checkBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
