import { Message, TextChannel, User } from 'discord.js';
import { createMockGuildMember, createMockMessage } from '../../../__tests__/mocks/discordMocks';
import { createMockWebhookService } from '../../../__tests__/mocks/serviceMocks';
import createGundamBot from '../../../starbunk/bots/reply-bots/gundamBot';
import ReplyBot from '../../../starbunk/bots/replyBot';
import { patchReplyBot } from '../../helpers/replyBotHelper';

describe('GundamBot', () => {
	let gundamBot: ReplyBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;

	beforeEach(() => {
		mockWebhookService = createMockWebhookService();
		mockMessage = createMockMessage('TestUser');
		gundamBot = createGundamBot(mockWebhookService);
		patchReplyBot(gundamBot, mockWebhookService);
	});

	describe('bot configuration', () => {
		it('should have correct name', () => {
			const identity = gundamBot.getIdentity();
			expect(identity.name).toBe('GundamBot');
		});

		it('should have correct avatar URL', () => {
			const identity = gundamBot.getIdentity();
			expect(identity.avatarUrl).toBe('https://cdn.discordapp.com/attachments/854790294253117531/902975839584849930/gundam.png');
		});
	});

	describe('message handling', () => {
		it('should ignore messages from bots', async () => {
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			mockMessage.content = 'gundam';

			await gundamBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "gundam" as a standalone word', async () => {
			mockMessage.content = 'gundam';

			await gundamBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'GundamBot',
					avatarURL: 'https://cdn.discordapp.com/attachments/854790294253117531/902975839584849930/gundam.png',
					content: "That's the giant unicorn robot gandam, there i said it"
				})
			);
		});

		it('should respond to "GUNDAM" (case insensitive)', async () => {
			mockMessage.content = 'GUNDAM';

			await gundamBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'GundamBot',
					avatarURL: 'https://cdn.discordapp.com/attachments/854790294253117531/902975839584849930/gundam.png',
					content: "That's the giant unicorn robot gandam, there i said it"
				})
			);
		});

		it('should respond to "gandam" (misspelling)', async () => {
			mockMessage.content = 'gandam';

			await gundamBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'GundamBot',
					avatarURL: 'https://cdn.discordapp.com/attachments/854790294253117531/902975839584849930/gundam.png',
					content: "That's the giant unicorn robot gandam, there i said it"
				})
			);
		});

		it('should respond to "gundam" in a sentence', async () => {
			mockMessage.content = 'I love watching gundam anime';

			await gundamBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'GundamBot',
					avatarURL: 'https://cdn.discordapp.com/attachments/854790294253117531/902975839584849930/gundam.png',
					content: "That's the giant unicorn robot gandam, there i said it"
				})
			);
		});

		it('should NOT respond to words containing "gundam" as a substring', async () => {
			mockMessage.content = 'gundamium';

			await gundamBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should NOT respond to unrelated messages', async () => {
			mockMessage.content = 'Hello there!';

			await gundamBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
