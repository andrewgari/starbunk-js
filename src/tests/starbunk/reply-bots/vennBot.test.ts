// Mocks need to be at the very top, before any imports
jest.mock('../../../webhooks/webhookService', () => {
	return {
		__esModule: true,
		default: {
			writeMessage: jest.fn().mockResolvedValue({})
		},
		WebhookService: jest.fn()
	};
});

// Create variables to control mock behaviors
let randomChanceShouldTrigger = true;
let userConditionShouldTrigger = true;

// Mock the RandomChanceCondition
jest.mock('../../../starbunk/bots/triggers/conditions/randomChanceCondition', () => {
	return {
		RandomChanceCondition: jest.fn().mockImplementation(() => ({
			shouldTrigger: jest.fn().mockImplementation(() => Promise.resolve(randomChanceShouldTrigger))
		}))
	};
});

// Mock the UserCondition
jest.mock('../../../starbunk/bots/triggers/conditions/userCondition', () => {
	return {
		UserCondition: jest.fn().mockImplementation(() => ({
			shouldTrigger: jest.fn().mockImplementation(() => Promise.resolve(userConditionShouldTrigger))
		}))
	};
});

// Mock the UserID for Venn
jest.mock('../../../discord/userID', () => ({
	Venn: 'venn-user-id'
}));

// Real imports after all mocks
import { Message, TextChannel, User } from 'discord.js';
import createVennBot from '../../../starbunk/bots/reply-bots/vennBot';
import ReplyBot from '../../../starbunk/bots/replyBot';
import webhookService from '../../../webhooks/webhookService';
import { createMockGuildMember, createMockMessage } from '../../mocks/discordMocks';

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

	beforeEach(() => {
		// Reset all mocks
		jest.clearAllMocks();

		// Reset variables
		randomChanceShouldTrigger = true;
		userConditionShouldTrigger = true;

		// Create message mock
		mockMessage = createMockMessage('TestUser');
		if (mockMessage.author) {
			Object.defineProperty(mockMessage.author, 'displayName', {
				value: 'TestUser',
				configurable: true
			});
		}

		// Create bot instance
		vennBot = createVennBot();
	});

	describe('bot configuration', () => {
		it('should have correct name', () => {
			// Act
			const identity = vennBot.getIdentity();

			// Assert
			expect(identity.name).toBe('VennBot');
		});

		it('should have correct avatar URL', () => {
			// Act
			const identity = vennBot.getIdentity();

			// Assert
			expect(identity.avatarUrl).toBe('https://cdn.discordapp.com/attachments/854790294253117531/902975839420497940/venn.png');
		});
	});

	describe('message handling', () => {
		it('should ignore messages from bots', async () => {
			// Arrange
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			mockMessage.content = 'Hello there';

			// Act
			await vennBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to messages from Venn with a random cringe message when both conditions are met', async () => {
			// Arrange
			const mockVennMember = createMockGuildMember('venn-user-id', 'Venn');
			mockMessage.author = mockVennMember.user as User;
			Object.defineProperty(mockMessage.author, 'id', {
				value: 'venn-user-id',
				configurable: true
			});
			mockMessage.content = 'Hello everyone!';
			userConditionShouldTrigger = true;
			randomChanceShouldTrigger = true;

			// Act
			await vennBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'VennBot',
					avatarURL: 'https://cdn.discordapp.com/attachments/854790294253117531/902975839420497940/venn.png',
					content: expect.stringMatching(new RegExp(expectedResponses.map(r => r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')))
				})
			);
		});

		it('should NOT respond to messages from Venn when random chance is not met', async () => {
			// Arrange
			const mockVennMember = createMockGuildMember('venn-user-id', 'Venn');
			mockMessage.author = mockVennMember.user as User;
			Object.defineProperty(mockMessage.author, 'id', {
				value: 'venn-user-id',
				configurable: true
			});
			mockMessage.content = 'Hello everyone!';
			userConditionShouldTrigger = true;
			randomChanceShouldTrigger = false;

			// Act
			await vennBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should NOT respond to messages from other users regardless of content', async () => {
			// Arrange
			const mockOtherMember = createMockGuildMember('other-user-id', 'OtherUser');
			mockMessage.author = mockOtherMember.user as User;
			Object.defineProperty(mockMessage.author, 'id', {
				value: 'other-user-id',
				configurable: true
			});
			mockMessage.content = 'Hello everyone!';
			userConditionShouldTrigger = false;
			randomChanceShouldTrigger = true;

			// Act
			await vennBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to messages from Venn containing any content when both conditions are met', async () => {
			// Arrange
			const mockVennMember = createMockGuildMember('venn-user-id', 'Venn');
			mockMessage.author = mockVennMember.user as User;
			Object.defineProperty(mockMessage.author, 'id', {
				value: 'venn-user-id',
				configurable: true
			});
			mockMessage.content = 'This message has nothing to do with venn or cringe';
			userConditionShouldTrigger = true;
			randomChanceShouldTrigger = true;

			// Act
			await vennBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
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
