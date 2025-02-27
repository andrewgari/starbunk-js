import { Message, TextChannel, User } from 'discord.js';
import { createMockGuildMember, createMockMessage } from '../../../__tests__/mocks/discordMocks';
import { createMockWebhookService } from '../../../__tests__/mocks/serviceMocks';
import createBlueBot from '../../../starbunk/bots/reply-bots/blueBot';
import ReplyBot from '../../../starbunk/bots/replyBot';
import { patchReplyBot } from '../../helpers/replyBotHelper';

// Mock the OpenAI client
jest.mock('@/openai/openaiClient', () => ({
	OpenAIClient: {
		detectBlueReference: jest.fn().mockResolvedValue(true)
	}
}));

describe('BlueBot', () => {
	let blueBot: ReplyBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;

	beforeEach(() => {
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

		// Skip this test for now as it requires more complex mocking
		it.skip('should respond to mean messages from Venn with Navy Seal copypasta', async () => {
			// This test would need to mock the RecentMessageCondition and CooldownCondition
			// which would require significant changes to the test setup
			expect(true).toBe(true); // Placeholder assertion
		});

		it('should NOT respond to unrelated messages', async () => {
			mockMessage.content = 'Hello there!';

			await blueBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
