import { createMockGuildMember, createMockMessage } from '@/__tests__/mocks/discordMocks';
import { createMockWebhookService } from '@/__tests__/mocks/serviceMocks';
import HoldBot from '@/starbunk/bots/reply-bots/holdBot';
import { Message, User } from 'discord.js';

describe('HoldBot', () => {
	let holdBot: HoldBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;

	beforeEach(() => {
		mockWebhookService = createMockWebhookService();
		mockMessage = createMockMessage('TestUser');
		holdBot = new HoldBot(mockWebhookService);
	});

	describe('bot configuration', () => {
		it('should have correct name', () => {
			expect(holdBot.getBotName()).toBe('HoldBot');
		});

		it('should have correct avatar URL', () => {
			expect(holdBot.getAvatarUrl()).toBe('https://i.imgur.com/YPFGEzM.png');
		});
	});

	describe('message handling', () => {
		const expectedMessageOptions = {
			username: 'HoldBot',
			avatarURL: 'https://i.imgur.com/YPFGEzM.png',
			content: 'Hold.',
			embeds: []
		};

		it('should ignore messages from bots', () => {
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			holdBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "Hold"', () => {
			mockMessage.content = 'Hold';
			holdBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expectedMessageOptions
			);
		});

		it('should respond to "Hold."', () => {
			mockMessage.content = 'Hold.';
			holdBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expectedMessageOptions
			);
		});

		it('should respond to "HOLD"', () => {
			mockMessage.content = 'HOLD';
			holdBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expectedMessageOptions
			);
		});

		it('should not respond to "Holding"', () => {
			mockMessage.content = 'Holding';
			holdBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should not respond to "household"', () => {
			mockMessage.content = 'household';
			holdBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "hold" within text', () => {
			mockMessage.content = 'please hold for a moment';
			holdBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expectedMessageOptions
			);
		});
	});
});
