import { Message, TextChannel, User } from 'discord.js';
import { createMockGuildMember, createMockMessage } from '../../../__tests__/mocks/discordMocks';
import { createMockWebhookService } from '../../../__tests__/mocks/serviceMocks';
import createHoldBot from '../../../starbunk/bots/reply-bots/holdBot';
import ReplyBot from '../../../starbunk/bots/replyBot';
import { patchReplyBot } from '../../helpers/replyBotHelper';

describe('HoldBot', () => {
	let holdBot: ReplyBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;

	beforeEach(() => {
		mockWebhookService = createMockWebhookService();
		mockMessage = createMockMessage('TestUser');
		holdBot = createHoldBot(mockWebhookService);
		patchReplyBot(holdBot, mockWebhookService);
	});

	describe('bot configuration', () => {
		it('should have correct name', () => {
			const identity = holdBot.getIdentity();
			expect(identity.name).toBe('HoldBot');
		});

		it('should have correct avatar URL', () => {
			const identity = holdBot.getIdentity();
			expect(identity.avatarUrl).toBe('https://i.imgur.com/YPFGEzM.png');
		});
	});

	describe('message handling', () => {
		it('should ignore messages from bots', async () => {
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			mockMessage.content = 'hold';

			await holdBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "hold" as a standalone word', async () => {
			mockMessage.content = 'hold';

			await holdBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'HoldBot',
					avatarURL: 'https://i.imgur.com/YPFGEzM.png',
					content: 'Hold.'
				})
			);
		});

		it('should respond to "HOLD" (case insensitive)', async () => {
			mockMessage.content = 'HOLD';

			await holdBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'HoldBot',
					avatarURL: 'https://i.imgur.com/YPFGEzM.png',
					content: 'Hold.'
				})
			);
		});

		it('should respond to "hold" in a sentence', async () => {
			mockMessage.content = 'Please hold the door';

			await holdBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'HoldBot',
					avatarURL: 'https://i.imgur.com/YPFGEzM.png',
					content: 'Hold.'
				})
			);
		});

		it('should NOT respond to words containing "hold" as a substring', async () => {
			mockMessage.content = 'household';

			await holdBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should NOT respond to unrelated messages', async () => {
			mockMessage.content = 'Hello there!';

			await holdBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
