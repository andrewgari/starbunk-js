import { Message, TextChannel, User } from 'discord.js';
import createChaosBot from '../../../starbunk/bots/reply-bots/chaosBot';
import ReplyBot from '../../../starbunk/bots/replyBot';
import { patchReplyBot } from '../../helpers/replyBotHelper';
import { createMockGuildMember, createMockMessage } from '../../mocks/discordMocks';
import { createMockWebhookService } from '../../mocks/serviceMocks';

describe('ChaosBot', () => {
	let chaosBot: ReplyBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;

	beforeEach(() => {
		mockWebhookService = createMockWebhookService();
		mockMessage = createMockMessage('TestUser');
		chaosBot = createChaosBot(mockWebhookService);
		patchReplyBot(chaosBot, mockWebhookService);
	});

	describe('bot configuration', () => {
		it('should have correct name', () => {
			const identity = chaosBot.getIdentity();
			expect(identity.name).toBe('ChaosBot');
		});

		it('should have correct avatar URL', () => {
			const identity = chaosBot.getIdentity();
			expect(identity.avatarUrl).toBe('https://preview.redd.it/md0lzbvuc3571.png?width=1920&format=png&auto=webp&s=ff403a8d4b514af8d99792a275d2c066b8d1a4de');
		});
	});

	describe('message handling', () => {
		it('should ignore messages from bots', async () => {
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			mockMessage.content = 'chaos';

			await chaosBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "chaos" as a standalone word', async () => {
			mockMessage.content = 'chaos';

			await chaosBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'ChaosBot',
					avatarURL: 'https://preview.redd.it/md0lzbvuc3571.png?width=1920&format=png&auto=webp&s=ff403a8d4b514af8d99792a275d2c066b8d1a4de',
					content: "All I know is...I'm here to kill Chaos"
				})
			);
		});

		it('should respond to "CHAOS" (case insensitive)', async () => {
			mockMessage.content = 'CHAOS';

			await chaosBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'ChaosBot',
					avatarURL: 'https://preview.redd.it/md0lzbvuc3571.png?width=1920&format=png&auto=webp&s=ff403a8d4b514af8d99792a275d2c066b8d1a4de',
					content: "All I know is...I'm here to kill Chaos"
				})
			);
		});

		it('should respond to "chaos" in a sentence', async () => {
			mockMessage.content = 'There is so much chaos in this room';

			await chaosBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'ChaosBot',
					avatarURL: 'https://preview.redd.it/md0lzbvuc3571.png?width=1920&format=png&auto=webp&s=ff403a8d4b514af8d99792a275d2c066b8d1a4de',
					content: "All I know is...I'm here to kill Chaos"
				})
			);
		});

		it('should NOT respond to words containing "chaos" as a substring', async () => {
			mockMessage.content = 'chaostheory';

			await chaosBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should NOT respond to unrelated messages', async () => {
			mockMessage.content = 'Hello there!';

			await chaosBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
