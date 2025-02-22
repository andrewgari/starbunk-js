import ChaosBot from '@/starbunk/bots/reply-bots/chaosBot';
import { createMockGuildMember, createMockMessage } from '@/tests/mocks/discordMocks';
import { createMockWebhookService } from '@/tests/mocks/serviceMocks';
import { Message, User } from 'discord.js';

describe('ChaosBot', () => {
	let chaosBot: ChaosBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;

	beforeEach(() => {
		mockWebhookService = createMockWebhookService();
		mockMessage = createMockMessage('TestUser');
		chaosBot = new ChaosBot(mockWebhookService);
	});

	describe('bot configuration', () => {
		it('should have correct name', () => {
			expect(chaosBot.getBotName()).toBe('ChaosBot');
		});

		it('should have correct avatar URL', () => {
			expect(chaosBot.getAvatarUrl()).toBe(
				'https://preview.redd.it/md0lzbvuc3571.png?width=1920&format=png&auto=webp&s=ff403a8d4b514af8d99792a275d2c066b8d1a4de'
			);
		});
	});

	describe('message handling', () => {
		const expectedMessageOptions: {
			username: string;
			avatarURL: string;
			content: string;
			embeds: never[];
		} = {
			username: 'ChaosBot',
			avatarURL:
				'https://preview.redd.it/md0lzbvuc3571.png?width=1920&format=png&auto=webp&s=ff403a8d4b514af8d99792a275d2c066b8d1a4de',
			content: "All I know is...I'm here to kill Chaos",
			embeds: []
		};

		it('should ignore messages from bots', () => {
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			chaosBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "chaos"', () => {
			mockMessage.content = 'chaos';
			chaosBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expectedMessageOptions
			);
		});

		it('should respond to case variations', () => {
			mockMessage.content = 'CHAOS';
			chaosBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expectedMessageOptions
			);
		});

		it('should respond to word within text', () => {
			mockMessage.content = 'bring chaos to the world';
			chaosBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expectedMessageOptions
			);
		});

		it('should not respond to unrelated messages', () => {
			mockMessage.content = 'hello world';
			chaosBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
