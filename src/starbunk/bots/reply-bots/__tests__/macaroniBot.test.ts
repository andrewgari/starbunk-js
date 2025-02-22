import { createMockMessage } from '@/test/mocks/discordMocks';
import { createMockWebhookService } from '@/test/mocks/serviceMocks';
import { Message, User } from 'discord.js';
import MacaroniBot from '../macaroniBot';
import userID from '@/discord/userID';

describe('MacaroniBot', () => {
	let macaroniBot: MacaroniBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;

	beforeEach(() => {
		mockWebhookService = createMockWebhookService();
		mockMessage = createMockMessage();
		macaroniBot = new MacaroniBot(mockWebhookService);
	});

	describe('bot configuration', () => {
		it('should have correct name', () => {
			expect(macaroniBot.getBotName()).toBe('Macaroni Bot');
		});

		it('should have correct avatar URL', () => {
			expect(macaroniBot.getAvatarUrl()).toBe('https://i.imgur.com/fgbH6Xf.jpg');
		});
	});

	describe('message handling', () => {
		const macaroniMessageOptions = {
			username: 'Macaroni Bot',
			avatarURL: 'https://i.imgur.com/fgbH6Xf.jpg',
			content: 'Correction: you mean Venn "Tyrone "The "Macaroni" Man" Johnson" Caelum',
			embeds: []
		};

		const vennMessageOptions = {
			username: 'Macaroni Bot',
			avatarURL: 'https://i.imgur.com/fgbH6Xf.jpg',
			content: `Are you trying to reach <@${userID.Venn}>`,
			embeds: []
		};

		it('should ignore messages from bots', () => {
			mockMessage.author = {
				bot: true,
				id: '123',
				username: 'test',
				discriminator: '1234',
				avatar: 'test'
			} as unknown as User;
			macaroniBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond with Venn correction for "macaroni"', () => {
			mockMessage.content = 'I love macaroni';
			macaroniBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				macaroniMessageOptions
			);
		});

		it('should respond with Venn correction for "pasta"', () => {
			mockMessage.content = 'pasta time!';
			macaroniBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				macaroniMessageOptions
			);
		});

		it('should respond with Venn mention for "venn"', () => {
			mockMessage.content = 'where is venn?';
			macaroniBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				vennMessageOptions
			);
		});

		it('should not respond to unrelated messages', () => {
			mockMessage.content = 'hello world';
			macaroniBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
