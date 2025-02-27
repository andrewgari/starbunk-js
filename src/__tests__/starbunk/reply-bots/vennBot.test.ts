import { Message, TextChannel, User } from 'discord.js';
import { createMockGuildMember, createMockMessage } from '../../../__tests__/mocks/discordMocks';
import { createMockWebhookService } from '../../../__tests__/mocks/serviceMocks';
import createVennBot from '../../../starbunk/bots/reply-bots/vennBot';
import ReplyBot from '../../../starbunk/bots/replyBot';
import { RandomChanceCondition } from '../../../starbunk/bots/triggers/conditions/randomChanceCondition';
import { UserCondition } from '../../../starbunk/bots/triggers/conditions/userCondition';
import { patchReplyBot } from '../../helpers/replyBotHelper';

// Mock the RandomChanceCondition to control the random behavior in tests
jest.mock('../../../starbunk/bots/triggers/conditions/randomChanceCondition');

// Mock the UserCondition to control the user check in tests
jest.mock('../../../starbunk/bots/triggers/conditions/userCondition');

// Mock the UserID for Venn
jest.mock('../../../discord/userID', () => ({
	Venn: 'venn-user-id'
}));

// Define the expected responses for easier testing
const expectedResponses = [
	'Sorry, but that was über cringe...',
	'Geez, that was hella cringe...',
	'That was cringe to the max...',
	'What a cringe thing to say...',
	'Mondo cringe, man...',
	"Yo that was the cringiest thing I've ever heard...",
	'Your daily serving of cringe, milord...',
	'On a scale of one to cringe, that was pretty cringe...',
	'That was pretty cringe :airplane:',
	'Wow, like....cringe much?',
	'Excuse me, I seem to have dropped my cringe. Do you have it perchance?',
	'Like I always say, that was pretty cringe...',
	'C.R.I.N.G.E',
];

describe('VennBot', () => {
	let vennBot: ReplyBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;
	let mockRandomChanceCondition: jest.Mock;
	let mockUserCondition: jest.Mock;

	beforeEach(() => {
		// Reset mocks
		mockRandomChanceCondition = RandomChanceCondition.prototype.shouldTrigger as jest.Mock;
		mockUserCondition = UserCondition.prototype.shouldTrigger as jest.Mock;

		// Default to not triggering
		mockRandomChanceCondition.mockResolvedValue(false);
		mockUserCondition.mockResolvedValue(false);

		mockWebhookService = createMockWebhookService();
		mockMessage = createMockMessage('TestUser');
		vennBot = createVennBot(mockWebhookService);
		patchReplyBot(vennBot, mockWebhookService);

		// Reset mocks between tests
		jest.clearAllMocks();
	});

	describe('bot configuration', () => {
		it('should have correct name', () => {
			const identity = vennBot.getIdentity();
			expect(identity.name).toBe('VennBot');
		});

		it('should have correct avatar URL', () => {
			const identity = vennBot.getIdentity();
			expect(identity.avatarUrl).toBe('https://cdn.discordapp.com/attachments/854790294253117531/902975839420497940/venn.png');
		});
	});

	describe('message handling', () => {
		it('should ignore messages from bots', async () => {
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			mockMessage.content = 'Hello there';

			await vennBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to messages from Venn with a random cringe message when random chance is met', async () => {
			// Create a message from Venn
			const mockVennMember = createMockGuildMember('venn-user-id', 'Venn');
			mockMessage.author = mockVennMember.user as User;
			Object.defineProperty(mockMessage.author, 'id', {
				value: 'venn-user-id',
				configurable: true
			});
			mockMessage.content = 'Hello everyone!';

			// Configure the conditions to trigger
			mockUserCondition.mockResolvedValue(true);
			mockRandomChanceCondition.mockResolvedValue(true);

			await vennBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'VennBot',
					avatarURL: 'https://cdn.discordapp.com/attachments/854790294253117531/902975839420497940/venn.png',
					content: expect.stringMatching(new RegExp(expectedResponses.map(r => r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')))
				})
			);
		});

		it('should NOT respond to messages from Venn when random chance is not met', async () => {
			// Create a message from Venn
			const mockVennMember = createMockGuildMember('venn-user-id', 'Venn');
			mockMessage.author = mockVennMember.user as User;
			Object.defineProperty(mockMessage.author, 'id', {
				value: 'venn-user-id',
				configurable: true
			});
			mockMessage.content = 'Hello everyone!';

			// Configure the UserCondition to trigger but RandomChanceCondition to not trigger
			mockUserCondition.mockResolvedValue(true);
			mockRandomChanceCondition.mockResolvedValue(false);

			await vennBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should NOT respond to messages from other users regardless of content', async () => {
			// Create a message from a non-Venn user
			const mockOtherMember = createMockGuildMember('other-user-id', 'OtherUser');
			mockMessage.author = mockOtherMember.user as User;
			Object.defineProperty(mockMessage.author, 'id', {
				value: 'other-user-id',
				configurable: true
			});
			mockMessage.content = 'Hello everyone!';

			// Configure the UserCondition to not trigger but RandomChanceCondition to trigger
			mockUserCondition.mockResolvedValue(false);
			mockRandomChanceCondition.mockResolvedValue(true);

			await vennBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to messages from Venn containing any content when both conditions are met', async () => {
			// Create a message from Venn with random content
			const mockVennMember = createMockGuildMember('venn-user-id', 'Venn');
			mockMessage.author = mockVennMember.user as User;
			Object.defineProperty(mockMessage.author, 'id', {
				value: 'venn-user-id',
				configurable: true
			});
			mockMessage.content = 'This message has nothing to do with venn or cringe';

			// Configure both conditions to trigger
			mockUserCondition.mockResolvedValue(true);
			mockRandomChanceCondition.mockResolvedValue(true);

			await vennBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'VennBot',
					avatarURL: 'https://cdn.discordapp.com/attachments/854790294253117531/902975839420497940/venn.png',
					content: expect.stringMatching(new RegExp(expectedResponses.map(r => r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')))
				})
			);
		});
	});
});
