import { createMockMessage } from '@/__tests__/mocks/discordMocks';
import { createMockWebhookService } from '@/__tests__/mocks/serviceMocks';
import BabyBot from '@/starbunk/bots/reply-bots/babyBot';
import { Message, User } from 'discord.js';

describe('BabyBot', () => {
	let babyBot: BabyBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;

	beforeEach(() => {
		mockWebhookService = createMockWebhookService();
		mockMessage = createMockMessage();
		babyBot = new BabyBot(mockWebhookService);
	});

	describe('bot configuration', () => {
		it('should have correct name', () => {
			expect(babyBot.getBotName()).toBe('BabyBot');
		});

		it('should have correct avatar URL', () => {
			expect(babyBot.getAvatarUrl()).toBe('https://i.redd.it/qc9qus78dc581.jpg');
		});
	});

	describe('message handling', () => {
		const expectedMessageOptions = {
			username: 'BabyBot',
			avatarURL: 'https://i.redd.it/qc9qus78dc581.jpg',
			content: 'https://media.tenor.com/NpnXNhWqKcwAAAAC/metroid-samus-aran.gif',
			embeds: []
		};

		it('should ignore messages from bots', () => {
			mockMessage.author = {
				bot: true,
				id: '123',
				username: 'test',
				discriminator: '1234',
				avatar: 'test',
				system: false
			} as unknown as User;
			babyBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "baby" in message', () => {
			mockMessage.content = 'hello baby!';
			babyBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expectedMessageOptions
			);
		});

		it('should respond to "BABY" in uppercase', () => {
			mockMessage.content = 'hello BABY!';
			babyBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expectedMessageOptions
			);
		});

		it('should not respond to "babylon"', () => {
			mockMessage.content = 'babylon';
			babyBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should not respond to "crybaby" as one word', () => {
			mockMessage.content = 'crybaby';
			babyBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "cry baby" as separate words', () => {
			mockMessage.content = 'cry baby';
			babyBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expectedMessageOptions
			);
		});

		it('should not respond when no match', () => {
			mockMessage.content = 'hello world';
			babyBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
