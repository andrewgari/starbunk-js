import { patchReplyBot } from '@/__tests__/helpers/replyBotHelper';
import { Message, User } from 'discord.js';
import { createMockGuildMember, createMockMessage } from '../../../__tests__/mocks/discordMocks';
import { createMockWebhookService } from '../../../__tests__/mocks/serviceMocks';
import UserID from '../../../discord/userID';
import PickleBot from '../../../starbunk/bots/reply-bots/pickleBot';
import Random from '../../../utils/random';

jest.mock('../../../utils/random');

describe('PickleBot', () => {
	let pickleBot: PickleBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;

	beforeEach(() => {
		mockWebhookService = createMockWebhookService();
		mockMessage = createMockMessage('TestUser');
		pickleBot = new PickleBot(mockWebhookService);
		jest.clearAllMocks();

		// Patch the sendReply method for synchronous testing
		patchReplyBot(pickleBot, mockWebhookService);
	});

	describe('bot configuration', () => {
		it('should have correct name', () => {
			expect(pickleBot.getBotName()).toBe('GremlinBot');
		});

		it('should have correct avatar URL', () => {
			expect(pickleBot.getAvatarUrl()).toBe('https://i.imgur.com/D0czJFu.jpg');
		});
	});

	describe('message handling', () => {
		const expectedMessageOptions = {
			username: 'GremlinBot',
			avatarURL: 'https://i.imgur.com/D0czJFu.jpg',
			content: "Could you repeat that? I don't speak *gremlin*",
			embeds: []
		};

		it('should ignore messages from bots', () => {
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			pickleBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "gremlin"', () => {
			mockMessage.content = 'gremlin';
			pickleBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expectedMessageOptions
			);
		});

		it('should respond to Sig messages with 15% chance', () => {
			mockMessage.author = { id: UserID.Sig } as User;
			(Random.percentChance as jest.Mock).mockReturnValue(true);
			pickleBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expectedMessageOptions
			);
		});

		it('should not respond to Sig messages with 85% chance', () => {
			mockMessage.author = { id: UserID.Sig } as User;
			(Random.percentChance as jest.Mock).mockReturnValue(false);
			pickleBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should not respond to unrelated messages', () => {
			mockMessage.content = 'hello world';
			pickleBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
