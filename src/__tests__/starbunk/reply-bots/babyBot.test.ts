import { Message, TextChannel, User } from 'discord.js';
import { createMockMessage } from '../../../__tests__/mocks/discordMocks';
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
		mockMessage = createMockMessage();
		babyBot = createBabyBot(mockWebhookService);

		// Patch the bot for testing
		patchReplyBot(babyBot, mockWebhookService);

		jest.useRealTimers();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('message handling', () => {
		const expectedMessageOptions = {
			username: 'BabyBot',
			avatarURL: 'https://i.redd.it/qc9qus78dc581.jpg',
			content: 'https://media.tenor.com/NpnXNhWqKcwAAAAC/metroid-samus-aran.gif',
			embeds: []
		};

		it('should ignore messages from bots', async () => {
			mockMessage.author = {
				bot: true,
				id: '123',
				username: 'test',
				discriminator: '1234',
				avatar: 'test',
				system: false
			} as unknown as User;
			await babyBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "baby" in message', async () => {
			mockMessage.content = 'hello baby!';
			await babyBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expectedMessageOptions
			);
		});

		it('should respond to "BABY" in uppercase', async () => {
			mockMessage.content = 'hello BABY!';
			await babyBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expectedMessageOptions
			);
		});

		it('should not respond to "babylon"', async () => {
			mockMessage.content = 'babylon';
			await babyBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should not respond to "crybaby" as one word', async () => {
			mockMessage.content = 'crybaby';
			await babyBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "cry baby" as separate words', async () => {
			mockMessage.content = 'cry baby';
			await babyBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expectedMessageOptions
			);
		});

		it('should not respond when no match', async () => {
			mockMessage.content = 'hello world';
			await babyBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
