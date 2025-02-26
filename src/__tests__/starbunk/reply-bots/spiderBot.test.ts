import { Message, TextChannel, User } from 'discord.js';
import { patchReplyBot } from '../../../__tests__/helpers/replyBotHelper';
import { createMockMessage } from '../../../__tests__/mocks/discordMocks';
import { createMockWebhookService } from '../../../__tests__/mocks/serviceMocks';
import createSpiderBot from '../../../starbunk/bots/reply-bots/spiderBot';
import ReplyBot from '../../../starbunk/bots/replyBot';

describe('SpiderBot', () => {
	let spiderBot: ReplyBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;

	beforeEach(() => {
		mockWebhookService = createMockWebhookService();
		mockMessage = createMockMessage();
		spiderBot = createSpiderBot(mockWebhookService);

		// Patch the sendReply method for synchronous testing
		patchReplyBot(spiderBot, mockWebhookService);

		jest.useRealTimers();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('bot configuration', () => {
		it('should have correct name', () => {
			expect(spiderBot.getIdentity().name).toBe('Spider-Bot');
		});

		it('should have correct avatar URL', () => {
			expect(spiderBot.getIdentity().avatarUrl).toBe('https://i.pinimg.com/736x/33/e0/06/33e00653eb485455ce5121b413b26d3b.jpg');
		});
	});

	describe('message handling', () => {
		const expectedMessageOptions = {
			username: 'Spider-Bot',
			avatarURL: 'https://i.pinimg.com/736x/33/e0/06/33e00653eb485455ce5121b413b26d3b.jpg',
			content: "Hey, it's \"**Spider-Man**\"! Don't forget the hyphen! Not Spiderman, that's dumb",
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
			await spiderBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "spiderman"', async () => {
			mockMessage.content = 'spiderman';
			await spiderBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expectedMessageOptions
			);
		});

		it('should respond to "spider man"', async () => {
			mockMessage.content = 'spider man';
			await spiderBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expectedMessageOptions
			);
		});

		it('should respond to "spider-man"', async () => {
			mockMessage.content = 'spider-man';
			await spiderBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expectedMessageOptions
			);
		});

		it('should not respond to unrelated messages', async () => {
			mockMessage.content = 'hello world';
			await spiderBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
