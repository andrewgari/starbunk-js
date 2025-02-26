import { patchReplyBot } from '@/__tests__/helpers/replyBotHelper';
import { Message, User } from 'discord.js';
import { createMockMessage } from '../../../__tests__/mocks/discordMocks';
import { createMockWebhookService } from '../../../__tests__/mocks/serviceMocks';
import userID from '../../../discord/userID';
import createMacaroniBot from '../../../starbunk/bots/reply-bots/macaroniBot';
import ReplyBot from '../../../starbunk/bots/replyBot';
import { formatUserMention } from '../../../utils/discordFormat';

describe('MacaroniBot', () => {
	let macaroniBot: ReplyBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;

	beforeEach(() => {
		mockWebhookService = createMockWebhookService();
		mockMessage = createMockMessage();
		macaroniBot = createMacaroniBot(mockWebhookService);

		// Patch the sendReply method for synchronous testing
		patchReplyBot(macaroniBot, mockWebhookService);
	});

	describe('bot configuration', () => {
		it('should have correct name', () => {
			const identity = macaroniBot.getIdentity();
			expect(identity.name).toBe('Macaroni Bot');
		});

		it('should have correct avatar URL', () => {
			const identity = macaroniBot.getIdentity();
			expect(identity.avatarUrl).toBe('https://i.imgur.com/fgbH6Xf.jpg');
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
			content: `Are you trying to reach ${formatUserMention(userID.Venn)}`,
			embeds: []
		};

		it('should ignore messages from bots', async () => {
			mockMessage.author = {
				bot: true,
				id: '123',
				username: 'test',
				discriminator: '1234',
				avatar: 'test'
			} as unknown as User;
			await macaroniBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond with Venn correction for "macaroni"', async () => {
			mockMessage.content = 'I love macaroni';
			await macaroniBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				macaroniMessageOptions
			);
		});

		it('should respond with Venn correction for "pasta"', async () => {
			mockMessage.content = 'pasta time!';
			await macaroniBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				macaroniMessageOptions
			);
		});

		it('should respond with Venn mention for "venn"', async () => {
			mockMessage.content = 'where is venn?';
			await macaroniBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				vennMessageOptions
			);
		});

		it('should not respond to unrelated messages', async () => {
			mockMessage.content = 'hello world';
			await macaroniBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
