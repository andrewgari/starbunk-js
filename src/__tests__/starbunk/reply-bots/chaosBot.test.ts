import { patchReplyBot } from '@/__tests__/helpers/replyBotHelper';
import { createMockGuildMember, createMockMessage, createMockTextChannel } from '@/__tests__/mocks/discordMocks';
import { createMockWebhookService } from '@/__tests__/mocks/serviceMocks';
import ChaosBot from '@/starbunk/bots/reply-bots/chaosBot';
import { Message, TextChannel, User } from 'discord.js';

describe('ChaosBot', () => {
	let chaosBot: ChaosBot;
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

		chaosBot = new ChaosBot(mockWebhookService);

		// Patch the bot for testing
		patchReplyBot(chaosBot, mockWebhookService);
	});

	describe('bot configuration', () => {
		it('should have correct name', () => {
			expect(chaosBot.botName).toBe('ChaosBot');
		});

		it('should have correct avatar URL', () => {
			expect(chaosBot.avatarUrl).toBe(
				'https://preview.redd.it/md0lzbvuc3571.png?width=1920&format=png&auto=webp&s=ff403a8d4b514af8d99792a275d2c066b8d1a4de'
			);
		});
	});

	describe('message handling', () => {
		it('should ignore messages from bots', async () => {
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			await chaosBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		describe('pattern matching', () => {
			it('should match "chaos"', () => {
				expect(chaosBot.shouldReplyToMessage('chaos')).toBe(true);
			});

			it('should match case variations', () => {
				expect(chaosBot.shouldReplyToMessage('CHAOS')).toBe(true);
			});

			it('should match word within text', () => {
				expect(chaosBot.shouldReplyToMessage('bring chaos to the world')).toBe(true);
			});

			it('should not match unrelated text', () => {
				expect(chaosBot.shouldReplyToMessage('hello world')).toBe(false);
			});
		});

		describe('response generation', () => {
			it('should return response for matching content', () => {
				expect(chaosBot.getResponseForMessage('chaos')).toBe("All I know is...I'm here to kill Chaos");
			});

			it('should return null for non-matching content', () => {
				expect(chaosBot.getResponseForMessage('hello world')).toBeNull();
			});
		});

		describe('message response', () => {
			it('should respond to messages with chaos', async () => {
				mockMessage.content = 'chaos';
				await chaosBot.handleMessage(mockMessage as Message<boolean>);

				expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
					mockChannel,
					expect.objectContaining({
						username: 'ChaosBot',
						avatarURL: chaosBot.avatarUrl,
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
