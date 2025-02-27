import { Message, TextChannel, User } from 'discord.js';
import createSpiderBot from '../../../starbunk/bots/reply-bots/spiderBot';
import ReplyBot from '../../../starbunk/bots/replyBot';
import { patchReplyBot } from '../../helpers/replyBotHelper';
import { createMockGuildMember, createMockMessage } from '../../mocks/discordMocks';
import { createMockWebhookService } from '../../mocks/serviceMocks';

describe('SpiderBot', () => {
	let spiderBot: ReplyBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;

	beforeEach(() => {
		mockWebhookService = createMockWebhookService();
		mockMessage = createMockMessage('TestUser');
		spiderBot = createSpiderBot(mockWebhookService);
		patchReplyBot(spiderBot, mockWebhookService);
	});

	describe('bot configuration', () => {
		it('should have correct name', () => {
			const identity = spiderBot.getIdentity();
			expect(identity.name).toBe('Spider-Bot');
		});

		it('should have correct avatar URL', () => {
			const identity = spiderBot.getIdentity();
			expect(identity.avatarUrl).toBe('https://i.pinimg.com/736x/33/e0/06/33e00653eb485455ce5121b413b26d3b.jpg');
		});
	});

	describe('message handling', () => {
		const expectedResponse = "Hey, it's \"**Spider-Man**\"! Don't forget the hyphen! Not Spiderman, that's dumb";

		const expectedMessageOptions = {
			username: 'Spider-Bot',
			avatarURL: 'https://i.pinimg.com/736x/33/e0/06/33e00653eb485455ce5121b413b26d3b.jpg',
			content: expectedResponse,
			embeds: []
		};

		it('should ignore messages from bots', async () => {
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			mockMessage.content = 'spiderman';

			await spiderBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "spiderman" (no hyphen)', async () => {
			mockMessage.content = 'spiderman';

			await spiderBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: expectedMessageOptions.username,
					avatarURL: expectedMessageOptions.avatarURL,
					content: expectedMessageOptions.content
				})
			);
		});

		it('should respond to "Spiderman" (case insensitive)', async () => {
			mockMessage.content = 'Spiderman';

			await spiderBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: expectedMessageOptions.username,
					avatarURL: expectedMessageOptions.avatarURL,
					content: expectedMessageOptions.content
				})
			);
		});

		it('should respond to "SPIDERMAN" (all caps)', async () => {
			mockMessage.content = 'SPIDERMAN';

			await spiderBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: expectedMessageOptions.username,
					avatarURL: expectedMessageOptions.avatarURL,
					content: expectedMessageOptions.content
				})
			);
		});

		it('should respond to "spider man" (with space instead of hyphen)', async () => {
			mockMessage.content = 'spider man';

			await spiderBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: expectedMessageOptions.username,
					avatarURL: expectedMessageOptions.avatarURL,
					content: expectedMessageOptions.content
				})
			);
		});

		it('should respond when "spiderman" is part of a sentence', async () => {
			mockMessage.content = 'I love spiderman movies!';

			await spiderBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: expectedMessageOptions.username,
					avatarURL: expectedMessageOptions.avatarURL,
					content: expectedMessageOptions.content
				})
			);
		});

		it('should NOT respond to "spider-man" (correct hyphenation)', async () => {
			mockMessage.content = 'spider-man';

			await spiderBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should NOT respond to "Spider-Man" (correct hyphenation, case insensitive)', async () => {
			mockMessage.content = 'Spider-Man';

			await spiderBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should NOT respond to unrelated messages', async () => {
			mockMessage.content = 'Hello there!';

			await spiderBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
