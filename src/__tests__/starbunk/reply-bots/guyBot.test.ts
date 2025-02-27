import { Message, TextChannel, User } from 'discord.js';
import { createMockGuildMember, createMockMessage } from '../../../__tests__/mocks/discordMocks';
import { createMockWebhookService } from '../../../__tests__/mocks/serviceMocks';
import createGuyBot from '../../../starbunk/bots/reply-bots/guyBot';
import ReplyBot from '../../../starbunk/bots/replyBot';
import { OneCondition } from '../../../starbunk/bots/triggers/conditions/oneCondition';
import { UserCondition } from '../../../starbunk/bots/triggers/conditions/userCondition';
import { patchReplyBot } from '../../helpers/replyBotHelper';

// Mock the conditions to control their behavior in tests
jest.mock('../../../starbunk/bots/triggers/conditions/oneCondition');
jest.mock('../../../starbunk/bots/triggers/conditions/patternCondition');
jest.mock('../../../starbunk/bots/triggers/conditions/randomChanceCondition');
jest.mock('../../../starbunk/bots/triggers/conditions/userCondition');

// Mock the UserID for Guy
jest.mock('../../../discord/userID', () => ({
	Guy: 'guy-user-id'
}));

describe('GuyBot', () => {
	let guyBot: ReplyBot;
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
		guyBot = createGuyBot(mockWebhookService);
		patchReplyBot(guyBot, mockWebhookService);
	});

	describe('bot configuration', () => {
		it('should have correct name', () => {
			const identity = guyBot.getIdentity();
			expect(identity.name).toBe('GuyBot');
		});

		it('should have correct avatar URL', () => {
			const identity = guyBot.getIdentity();
			expect(identity.avatarUrl).toBe('https://i.pinimg.com/originals/dc/39/85/dc3985a3ac127397c53bf8c3a749b011.jpg');
		});
	});

	describe('message handling', () => {
		it('should ignore messages from bots', async () => {
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			mockMessage.content = 'guy';

			await guyBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "guy" when pattern condition triggers', async () => {
			mockMessage.content = 'guy';

			// Make the OneCondition trigger
			mockOneCondition.prototype.shouldTrigger.mockResolvedValue(true);

			await guyBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'GuyBot',
					avatarURL: 'https://i.pinimg.com/originals/dc/39/85/dc3985a3ac127397c53bf8c3a749b011.jpg',
					content: expect.any(String)
				})
			);
		});

		it('should respond to messages from Guy when user condition triggers', async () => {
			// Create a message from Guy
			const mockGuyMember = createMockGuildMember('guy-user-id', 'Guy');
			mockMessage.author = mockGuyMember.user as User;
			Object.defineProperty(mockMessage.author, 'id', {
				value: 'guy-user-id',
				configurable: true
			});
			mockMessage.content = 'Hello everyone!';

			// Make the OneCondition trigger
			mockOneCondition.prototype.shouldTrigger.mockResolvedValue(true);

			await guyBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'GuyBot',
					avatarURL: 'https://i.pinimg.com/originals/dc/39/85/dc3985a3ac127397c53bf8c3a749b011.jpg',
					content: expect.any(String)
				})
			);
		});

		it('should NOT respond when no condition triggers', async () => {
			mockMessage.content = 'Hello there!';

			// Make the OneCondition not trigger
			mockOneCondition.prototype.shouldTrigger.mockResolvedValue(false);

			await guyBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
