import { Message, TextChannel, User } from 'discord.js';
import createSigGreatBot from '../../../starbunk/bots/reply-bots/sigGreatBot';
import ReplyBot from '../../../starbunk/bots/replyBot';
import { patchReplyBot } from '../../helpers/replyBotHelper';
import { createMockGuildMember, createMockMessage } from '../../mocks/discordMocks';
import { createMockWebhookService } from '../../mocks/serviceMocks';

describe('SigGreatBot', () => {
	let sigGreatBot: ReplyBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;

	beforeEach(() => {
		mockWebhookService = createMockWebhookService();
		mockMessage = createMockMessage('TestUser');
		sigGreatBot = createSigGreatBot(mockWebhookService);
		patchReplyBot(sigGreatBot, mockWebhookService);
	});

	describe('bot configuration', () => {
		it('should have correct name', () => {
			const identity = sigGreatBot.getIdentity();
			expect(identity.name).toBe('SigGreatBot');
		});

		it('should have correct avatar URL', () => {
			const identity = sigGreatBot.getIdentity();
			expect(identity.avatarUrl).toBe('https://static.wikia.nocookie.net/chrono/images/a/a5/Serge2.png');
		});
	});

	describe('message handling', () => {
		it('should ignore messages from bots', async () => {
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			mockMessage.content = 'sig best';

			await sigGreatBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "sig best"', async () => {
			mockMessage.content = 'sig best';

			await sigGreatBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'SigGreatBot',
					avatarURL: 'https://static.wikia.nocookie.net/chrono/images/a/a5/Serge2.png',
					content: 'The greatest.'
				})
			);
		});

		it('should respond to "sig greatest"', async () => {
			mockMessage.content = 'sig greatest';

			await sigGreatBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'SigGreatBot',
					avatarURL: 'https://static.wikia.nocookie.net/chrono/images/a/a5/Serge2.png',
					content: 'The greatest.'
				})
			);
		});

		it('should respond to "SIG BEST" (case insensitive)', async () => {
			mockMessage.content = 'SIG BEST';

			await sigGreatBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'SigGreatBot',
					avatarURL: 'https://static.wikia.nocookie.net/chrono/images/a/a5/Serge2.png',
					content: 'The greatest.'
				})
			);
		});

		it('should respond to "sig best" in a sentence', async () => {
			mockMessage.content = 'I think sig best character';

			await sigGreatBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'SigGreatBot',
					avatarURL: 'https://static.wikia.nocookie.net/chrono/images/a/a5/Serge2.png',
					content: 'The greatest.'
				})
			);
		});

		it('should NOT respond to "sig" without "best" or "greatest"', async () => {
			mockMessage.content = 'sig is cool';

			await sigGreatBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should NOT respond to unrelated messages', async () => {
			mockMessage.content = 'Hello there!';

			await sigGreatBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
