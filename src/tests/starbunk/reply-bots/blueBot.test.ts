import { Message, TextChannel, User } from 'discord.js';
import createBlueBot from '../../../starbunk/bots/reply-bots/blueBot';
import ReplyBot from '../../../starbunk/bots/replyBot';
import { CooldownCondition } from '../../../starbunk/bots/triggers/conditions/cooldownCondition';
import { RecentMessageCondition } from '../../../starbunk/bots/triggers/conditions/recentMessageCondition';
import { patchReplyBot } from '../../helpers/replyBotHelper';
import { createMockGuildMember, createMockMessage } from '../../mocks/discordMocks';
import { createMockWebhookService } from '../../mocks/serviceMocks';

// Mock the OpenAI client
jest.mock('@/openai/openaiClient', () => ({
	OpenAIClient: {
		detectBlueReference: jest.fn().mockResolvedValue(true)
	}
}));

// Mock the RecentMessageCondition and CooldownCondition
jest.mock('../../../starbunk/bots/triggers/conditions/recentMessageCondition');
jest.mock('../../../starbunk/bots/triggers/conditions/cooldownCondition');

// Mock the UserID for Venn
jest.mock('../../../discord/userID', () => ({
	Venn: 'venn-user-id'
}));

describe('BlueBot', () => {
	let blueBot: ReplyBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;

	// Mock implementations for the conditions
	let mockRecentMessageCondition: jest.Mock;
	let mockCooldownCondition: jest.Mock;

	beforeEach(() => {
		// Reset mocks
		mockRecentMessageCondition = RecentMessageCondition.prototype.shouldTrigger as jest.Mock;
		mockCooldownCondition = CooldownCondition.prototype.shouldTrigger as jest.Mock;

		// Default behavior: recent message is false, cooldown is true
		mockRecentMessageCondition.mockResolvedValue(false);
		mockCooldownCondition.mockResolvedValue(true);

		mockWebhookService = createMockWebhookService();
		mockMessage = createMockMessage('TestUser');
		// Ensure the author has a displayName
		if (mockMessage.author) {
			Object.defineProperty(mockMessage.author, 'displayName', {
				value: 'TestUser',
				configurable: true
			});
		}
		blueBot = createBlueBot({ webhookService: mockWebhookService });
		patchReplyBot(blueBot, mockWebhookService);
	});

	describe('bot configuration', () => {
		it('should have correct name', () => {
			const identity = blueBot.getIdentity();
			expect(identity.name).toBe('BlueBot');
		});

		it('should have correct default avatar URL', () => {
			const identity = blueBot.getIdentity();
			expect(identity.avatarUrl).toBe('https://imgur.com/WcBRCWn.png');
		});
	});

	describe('message handling', () => {
		it('should ignore messages from bots', async () => {
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			Object.defineProperty(mockMessage.author, 'displayName', {
				value: 'BotUser',
				configurable: true
			});
			mockMessage.content = 'blue';

			await blueBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "blue" with default message', async () => {
			mockMessage.content = 'blue';

			await blueBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'BlueBot',
					avatarURL: 'https://imgur.com/WcBRCWn.png',
					content: 'Did somebody say Blu'
				})
			);
		});

		it('should respond to "bluebot, say something nice about TestUser"', async () => {
			mockMessage.content = 'bluebot, say something nice about TestUser';

			await blueBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'BlueBot',
					avatarURL: 'https://imgur.com/WcBRCWn.png',
					content: 'TestUser, I think you\'re really blu'
				})
			);
		});

		it('should respond to "bluebot, say something nice about me"', async () => {
			mockMessage.content = 'bluebot, say something nice about me';

			// Mock the member property using Object.defineProperty
			const mockMember = createMockGuildMember('user-id', 'TestUser');
			Object.defineProperty(mockMember, 'displayName', {
				value: 'TestUser',
				configurable: true
			});
			Object.defineProperty(mockMessage, 'member', {
				value: mockMember,
				configurable: true
			});

			await blueBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'BlueBot',
					avatarURL: 'https://imgur.com/WcBRCWn.png',
					content: 'TestUser, I think you\'re really blu'
				})
			);
		});

		it('should respond to "bluebot say something mean about venn" with special message', async () => {
			mockMessage.content = 'bluebot say something mean about venn';

			await blueBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'BlueBot',
					avatarURL: 'https://imgur.com/Tpo8Ywd.jpg',
					content: 'No way, Venn can suck my blu cane'
				})
			);
		});

		it('should respond to mean messages from Venn with Navy Seal copypasta', async () => {
			// Create a message from Venn with a mean message about blue
			const mockVennMember = createMockGuildMember('venn-user-id', 'Venn');
			mockMessage.author = mockVennMember.user as User;
			Object.defineProperty(mockMessage.author, 'displayName', {
				value: 'Venn',
				configurable: true
			});
			Object.defineProperty(mockMessage.author, 'id', {
				value: 'venn-user-id',
				configurable: true
			});
			mockMessage.content = 'I hate blue, it\'s the worst bot ever';

			// Configure mocks to allow the Navy Seal copypasta to trigger:
			// 1. RecentMessageCondition should return true (bot said something within last 5 minutes)
			// 2. CooldownCondition should return true (cooldown period has passed)
			mockRecentMessageCondition.mockResolvedValue(true);
			mockCooldownCondition.mockResolvedValue(true);

			await blueBot.handleMessage(mockMessage as Message<boolean>);

			// Verify the Navy Seal copypasta was sent
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'BlueBot',
					avatarURL: 'https://imgur.com/WcBRCWn.png',
					content: expect.stringContaining('What the fuck did you just fucking say about me')
				})
			);
		});

		it('should NOT respond with Navy Seal copypasta if RecentMessageCondition is false', async () => {
			// Create a message from Venn with a mean message about blue
			const mockVennMember = createMockGuildMember('venn-user-id', 'Venn');
			mockMessage.author = mockVennMember.user as User;
			Object.defineProperty(mockMessage.author, 'displayName', {
				value: 'Venn',
				configurable: true
			});
			Object.defineProperty(mockMessage.author, 'id', {
				value: 'venn-user-id',
				configurable: true
			});
			mockMessage.content = 'I hate blue, it\'s the worst bot ever';

			// Configure mocks to prevent the Navy Seal copypasta from triggering:
			// RecentMessageCondition should return false (bot didn't say something within last 5 minutes)
			mockRecentMessageCondition.mockResolvedValue(false);
			mockCooldownCondition.mockResolvedValue(true);

			await blueBot.handleMessage(mockMessage as Message<boolean>);

			// Verify the Navy Seal copypasta was NOT sent
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					content: expect.stringContaining('What the fuck did you just fucking say about me')
				})
			);
		});

		it('should NOT respond with Navy Seal copypasta if CooldownCondition is false', async () => {
			// Create a message from Venn with a mean message about blue
			const mockVennMember = createMockGuildMember('venn-user-id', 'Venn');
			mockMessage.author = mockVennMember.user as User;
			Object.defineProperty(mockMessage.author, 'displayName', {
				value: 'Venn',
				configurable: true
			});
			Object.defineProperty(mockMessage.author, 'id', {
				value: 'venn-user-id',
				configurable: true
			});
			mockMessage.content = 'I hate blue, it\'s the worst bot ever';

			// Configure mocks to prevent the Navy Seal copypasta from triggering:
			// RecentMessageCondition should return true (bot said something within last 5 minutes)
			// CooldownCondition should return false (cooldown period hasn't passed - already sent within 24 hours)
			mockRecentMessageCondition.mockResolvedValue(true);
			mockCooldownCondition.mockResolvedValue(false);

			await blueBot.handleMessage(mockMessage as Message<boolean>);

			// Verify the Navy Seal copypasta was NOT sent
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					content: expect.stringContaining('What the fuck did you just fucking say about me')
				})
			);
		});

		it('should NOT respond to unrelated messages', async () => {
			mockMessage.content = 'Hello there!';

			await blueBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
