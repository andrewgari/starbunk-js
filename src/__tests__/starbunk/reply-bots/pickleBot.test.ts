import { Message, TextChannel, User } from 'discord.js';
import { createMockGuildMember, createMockMessage } from '../../../__tests__/mocks/discordMocks';
import { createMockWebhookService } from '../../../__tests__/mocks/serviceMocks';
import createPickleBot from '../../../starbunk/bots/reply-bots/pickleBot';
import ReplyBot from '../../../starbunk/bots/replyBot';
import { OneCondition } from '../../../starbunk/bots/triggers/conditions/oneCondition';
import { UserCondition } from '../../../starbunk/bots/triggers/conditions/userCondition';
import { patchReplyBot } from '../../helpers/replyBotHelper';

// Mock the conditions to control their behavior in tests
jest.mock('../../../starbunk/bots/triggers/conditions/oneCondition');
jest.mock('../../../starbunk/bots/triggers/conditions/patternCondition');
jest.mock('../../../starbunk/bots/triggers/conditions/randomChanceCondition');
jest.mock('../../../starbunk/bots/triggers/conditions/userCondition');

// Mock the UserID for Sig
jest.mock('../../../discord/userID', () => ({
	Sig: 'sig-user-id'
}));

describe('PickleBot', () => {
	let pickleBot: ReplyBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;
	let mockOneCondition: jest.MockedClass<typeof OneCondition>;
	let mockUserCondition: jest.Mock;

	beforeEach(() => {
		// Reset mocks
		jest.clearAllMocks();

		// Setup mocks for conditions
		mockOneCondition = OneCondition as jest.MockedClass<typeof OneCondition>;
		mockUserCondition = UserCondition.prototype.shouldTrigger as jest.Mock;

		// Mock the shouldTrigger method
		mockOneCondition.prototype.shouldTrigger = jest.fn().mockResolvedValue(false);
		mockUserCondition.mockResolvedValue(false);

		mockWebhookService = createMockWebhookService();
		mockMessage = createMockMessage('TestUser');
		pickleBot = createPickleBot(mockWebhookService);
		patchReplyBot(pickleBot, mockWebhookService);
	});

	describe('bot configuration', () => {
		it('should have correct name', () => {
			const identity = pickleBot.getIdentity();
			expect(identity.name).toBe('PickleBot');
		});

		it('should have correct avatar URL', () => {
			const identity = pickleBot.getIdentity();
			expect(identity.avatarUrl).toBe('https://i.imgur.com/D0czJFu.jpg');
		});
	});

	describe('message handling', () => {
		it('should ignore messages from bots', async () => {
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			mockMessage.content = 'gremlin';

			await pickleBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "gremlin" when pattern condition triggers', async () => {
			mockMessage.content = 'gremlin';

			// Make the OneCondition trigger
			mockOneCondition.prototype.shouldTrigger.mockResolvedValue(true);

			await pickleBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'PickleBot',
					avatarURL: 'https://i.imgur.com/D0czJFu.jpg',
					content: "Could you repeat that? I don't speak *gremlin*"
				})
			);
		});

		it('should respond to messages from Sig containing "gremlin"', async () => {
			// Create a message from Sig with "gremlin"
			const mockSigMember = createMockGuildMember('sig-user-id', 'Sig');
			mockMessage.author = mockSigMember.user as User;
			Object.defineProperty(mockMessage.author, 'id', {
				value: 'sig-user-id',
				configurable: true
			});
			mockMessage.content = 'I am a gremlin';

			// Make the OneCondition trigger
			mockOneCondition.prototype.shouldTrigger.mockResolvedValue(true);

			await pickleBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'PickleBot',
					avatarURL: 'https://i.imgur.com/D0czJFu.jpg',
					content: "Could you repeat that? I don't speak *gremlin*"
				})
			);
		});

		it('should NOT respond when no condition triggers', async () => {
			mockMessage.content = 'some random message';

			// Make the OneCondition not trigger
			mockOneCondition.prototype.shouldTrigger.mockResolvedValue(false);

			await pickleBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
