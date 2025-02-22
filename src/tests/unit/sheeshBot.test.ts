import SheeshBot from '@/starbunk/bots/reply-bots/sheeshBot';
import { createMockGuildMember, createMockMessage } from '@/tests/mocks/discordMocks';
import { createMockWebhookService } from '@/tests/mocks/serviceMocks';
import { Message, User } from 'discord.js';

describe('SheeshBot', () => {
	let sheeshBot: SheeshBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;

	beforeEach(() => {
		mockWebhookService = createMockWebhookService();
		mockMessage = createMockMessage('TestUser');
		sheeshBot = new SheeshBot(mockWebhookService);
		jest.spyOn(sheeshBot, 'generateRandomEs').mockReturnValue('eeeee');
	});

	describe('bot configuration', () => {
		it('should have correct name', () => {
			expect(sheeshBot.getBotName()).toBe('Sheesh Bot');
		});

		it('should have correct avatar URL', () => {
			expect(sheeshBot.getAvatarUrl()).toBe('https://i.imgflip.com/5fc2iz.png?a471000');
		});
	});

	describe('message handling', () => {
		const expectedMessageOptions: {
			username: string;
			avatarURL: string;
			content: string;
			embeds: never[];
		} = {
			username: 'Sheesh Bot',
			avatarURL: 'https://i.imgflip.com/5fc2iz.png?a471000',
			content: 'Sheeeeesh!',
			embeds: []
		};

		const exactSheeshMessageOptions: {
			username: string;
			avatarURL: string;
			content: string;
			embeds: never[];
		} = {
			username: 'Sheesh Bot',
			avatarURL: 'https://i.imgflip.com/5fc2iz.png?a471000',
			content: 'SHEEEEEEEESH 😤',
			embeds: []
		};

		it('should ignore messages from bots', () => {
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			sheeshBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "sheesh"', () => {
			mockMessage.content = 'sheesh';
			sheeshBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				exactSheeshMessageOptions
			);
		});

		it('should respond to "sheeesh" with random e\'s', () => {
			mockMessage.content = 'sheeesh';
			sheeshBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expectedMessageOptions
			);
		});

		it('should not respond to unrelated messages', () => {
			mockMessage.content = 'hello world';
			sheeshBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		describe('sheesh variations', () => {
			it('should respond with exact message for "sheesh"', () => {
				mockMessage.content = 'sheesh';
				sheeshBot.handleMessage(mockMessage as Message<boolean>);
				expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
					mockMessage.channel,
					exactSheeshMessageOptions
				);
			});

			it('should handle multiple e variations', () => {
				const testCases = ['sheeesh', 'sheeeesh', 'sheeeeesh'];

				testCases.forEach(sheeshVariation => {
					mockMessage.content = sheeshVariation;
					sheeshBot.handleMessage(mockMessage as Message<boolean>);
					expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
						mockMessage.channel,
						expectedMessageOptions
					);
				});
			});

			it('should be case insensitive', () => {
				const testCases = ['SHEEESH', 'sHeEeSh', 'ShEeSh'];

				testCases.forEach(sheeshVariation => {
					mockMessage.content = sheeshVariation;
					sheeshBot.handleMessage(mockMessage as Message<boolean>);
					expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
						mockMessage.channel,
						expectedMessageOptions
					);
				});
			});
		});
	});
});
