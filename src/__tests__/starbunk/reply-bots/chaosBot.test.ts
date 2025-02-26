import { patchReplyBot } from '@/__tests__/helpers/replyBotHelper';
import { createMockGuildMember, createMockMessage, createMockTextChannel } from '@/__tests__/mocks/discordMocks';
import { createMockWebhookService } from '@/__tests__/mocks/serviceMocks';
import createChaosBot from '@/starbunk/bots/reply-bots/chaosBot';
import ReplyBot from '@/starbunk/bots/replyBot';
import { Message, TextChannel, User } from 'discord.js';

describe('ChaosBot', () => {
	let chaosBot: ReplyBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;
	let mockChannel: TextChannel;

	beforeEach(() => {
		mockWebhookService = createMockWebhookService();
		mockChannel = createMockTextChannel();

		// Create the mock message with the channel already set
		mockMessage = {
			...createMockMessage('TestUser'),
			channel: mockChannel,
			content: ''
		};

		chaosBot = createChaosBot(mockWebhookService);

		// Patch the bot for testing
		patchReplyBot(chaosBot, mockWebhookService);
	});

	describe('message handling', () => {
		it('should ignore messages from bots', async () => {
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			await chaosBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		describe('message response', () => {
			it('should respond to messages with chaos', async () => {
				mockMessage.content = 'chaos';
				await chaosBot.handleMessage(mockMessage as Message<boolean>);

				expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
					mockChannel,
					expect.objectContaining({
						username: 'ChaosBot',
						avatarURL: 'https://preview.redd.it/md0lzbvuc3571.png?width=1920&format=png&auto=webp&s=ff403a8d4b514af8d99792a275d2c066b8d1a4de',
						content: "All I know is...I'm here to kill Chaos"
					})
				);
			});

			it('should not respond to messages not matching pattern', async () => {
				mockMessage.content = 'hello world';
				await chaosBot.handleMessage(mockMessage as Message<boolean>);
				expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
			});
		});
	});
});
