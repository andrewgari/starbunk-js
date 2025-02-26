import { patchReplyBot } from '@/__tests__/helpers/replyBotHelper';
import { Message, User } from 'discord.js';
import { createMockGuildMember, createMockMessage } from '../../../__tests__/mocks/discordMocks';
import { createMockWebhookService } from '../../../__tests__/mocks/serviceMocks';
import createHoldBot from '../../../starbunk/bots/reply-bots/holdBot';
import ReplyBot from '../../../starbunk/bots/replyBot';

describe('HoldBot', () => {
	let holdBot: ReplyBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;

	beforeEach(() => {
		mockWebhookService = createMockWebhookService();
		mockMessage = createMockMessage('TestUser');
		holdBot = createHoldBot(mockWebhookService);

		// Patch the sendReply method for synchronous testing
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
		const expectedMessageOptions = {
			username: 'HoldBot',
			avatarURL: 'https://i.imgur.com/YPFGEzM.png',
			content: 'Hold.',
			embeds: []
		};

		it('should ignore messages from bots', async () => {
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			await holdBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "Hold"', async () => {
			mockMessage.content = 'Hold';
			await holdBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expectedMessageOptions
			);
		});

		it('should respond to "Hold."', async () => {
			mockMessage.content = 'Hold.';
			await holdBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expectedMessageOptions
			);
		});

		it('should respond to "HOLD"', async () => {
			mockMessage.content = 'HOLD';
			await holdBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expectedMessageOptions
			);
		});

		it('should not respond to "Holding"', async () => {
			mockMessage.content = 'Holding';
			await holdBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should not respond to "household"', async () => {
			mockMessage.content = 'household';
			await holdBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "hold" within text', async () => {
			mockMessage.content = 'please hold for a moment';
			await holdBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expectedMessageOptions
			);
		});
	});
});
