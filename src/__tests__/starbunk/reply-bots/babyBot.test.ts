import { Message, TextChannel, User } from 'discord.js';
import { createMockGuildMember, createMockMessage } from '../../../__tests__/mocks/discordMocks';
import { createMockWebhookService } from '../../../__tests__/mocks/serviceMocks';
import createBabyBot from '../../../starbunk/bots/reply-bots/babyBot';
import ReplyBot from '../../../starbunk/bots/replyBot';
import { patchReplyBot } from '../../helpers/replyBotHelper';

describe('BabyBot', () => {
	let babyBot: ReplyBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;

	beforeEach(() => {
		mockWebhookService = createMockWebhookService();
		mockMessage = createMockMessage('TestUser');
		babyBot = createBabyBot(mockWebhookService);
		patchReplyBot(babyBot, mockWebhookService);
	});

	describe('bot configuration', () => {
		it('should have correct name', () => {
			const identity = babyBot.getIdentity();
			expect(identity.name).toBe('BabyBot');
		});

		it('should have correct avatar URL', () => {
			const identity = babyBot.getIdentity();
			expect(identity.avatarUrl).toBe('https://i.redd.it/qc9qus78dc581.jpg');
		});
	});

	describe('message handling', () => {
		it('should ignore messages from bots', async () => {
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			mockMessage.content = 'baby';

			await babyBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "baby" as a standalone word', async () => {
			mockMessage.content = 'baby';

			await babyBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'BabyBot',
					avatarURL: 'https://i.redd.it/qc9qus78dc581.jpg',
					content: 'https://media.tenor.com/NpnXNhWqKcwAAAAC/metroid-samus-aran.gif'
				})
			);
		});

		it('should respond to "baby" in a sentence', async () => {
			mockMessage.content = 'Look at that baby over there';

			await babyBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'BabyBot',
					avatarURL: 'https://i.redd.it/qc9qus78dc581.jpg',
					content: 'https://media.tenor.com/NpnXNhWqKcwAAAAC/metroid-samus-aran.gif'
				})
			);
		});

		it('should respond to "BABY" (case insensitive)', async () => {
			mockMessage.content = 'BABY';

			await babyBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'BabyBot',
					avatarURL: 'https://i.redd.it/qc9qus78dc581.jpg',
					content: 'https://media.tenor.com/NpnXNhWqKcwAAAAC/metroid-samus-aran.gif'
				})
			);
		});

		it('should NOT respond to words containing "baby" as a substring', async () => {
			mockMessage.content = 'babysitter';

			await babyBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should NOT respond to unrelated messages', async () => {
			mockMessage.content = 'Hello there!';

			await babyBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
