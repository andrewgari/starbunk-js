// Set up mocks before imports
jest.mock('../../../starbunk/bots/triggers/conditions/oneCondition');
jest.mock('../../../starbunk/bots/triggers/conditions/patternCondition');
jest.mock('../../../starbunk/bots/triggers/conditions/randomChanceCondition');
jest.mock('../../../starbunk/bots/triggers/conditions/userCondition');
jest.mock('../../../starbunk/bots/triggers/conditions/allConditions');
jest.mock('../../../webhooks/webhookService', () => {
	return {
		__esModule: true,
		default: {
			writeMessage: jest.fn().mockResolvedValue(undefined),
			getChannelWebhook: jest.fn().mockResolvedValue({}),
			getWebhook: jest.fn().mockResolvedValue({}),
			getWebhookName: jest.fn().mockReturnValue('MockWebhook')
		},
		WebhookService: jest.fn().mockImplementation(() => ({
			writeMessage: jest.fn().mockResolvedValue(undefined),
			getChannelWebhook: jest.fn().mockResolvedValue({}),
			getWebhook: jest.fn().mockResolvedValue({}),
			getWebhookName: jest.fn().mockReturnValue('MockWebhook')
		}))
	};
});

// Mock the Logger to prevent console outputs
jest.mock('../../../services/logger', () => ({
	Logger: {
		debug: jest.fn(),
		info: jest.fn(),
		success: jest.fn(),
		warn: jest.fn(),
		error: jest.fn()
	}
}));

// Mock the userIdentity module to prevent console errors
jest.mock('../../../starbunk/bots/identity/userIdentity', () => ({
	getUserIdentity: jest.fn().mockImplementation(message => {
		// When message is from Guy, return GuyBot identity
		if (message?.author?.id === 'guy-user-id') {
			return Promise.resolve({
				name: 'GuyBot',
				avatarUrl: 'https://i.pinimg.com/originals/dc/39/85/dc3985a3ac127397c53bf8c3a749b011.jpg'
			});
		}
		// Otherwise return mock user
		return Promise.resolve({
			name: 'MockUser',
			avatarUrl: 'https://example.com/avatar.jpg'
		});
	})
}));

// Mock the UserID for Guy
jest.mock('../../../discord/userID', () => ({
	Guy: 'guy-user-id'
}));

import { Message, TextChannel, User } from 'discord.js';
import createGuyBot from '../../../starbunk/bots/reply-bots/guyBot';
import { OneCondition } from '../../../starbunk/bots/triggers/conditions/oneCondition';
import { UserCondition } from '../../../starbunk/bots/triggers/conditions/userCondition';
import { WebhookService } from '../../../webhooks/webhookService';
import { createMockGuildMember, createMockMessage } from '../../mocks/discordMocks';

describe('GuyBot', () => {
	// Mocks setup
	const mockWebhookService = {
		writeMessage: jest.fn().mockResolvedValue(undefined),
	};

	// Mock condition responses
	let oneConditionShouldTriggerResponse = false;

	beforeAll(() => {
		// Mock implementations are already set up in the jest.mock() call

		// Mock OneCondition constructor and shouldTrigger method
		(OneCondition as jest.MockedClass<typeof OneCondition>).mockImplementation(() => {
			return {
				shouldTrigger: jest.fn().mockImplementation(() => Promise.resolve(oneConditionShouldTriggerResponse)),
			} as unknown as OneCondition;
		});

		// Mock UserCondition constructor and shouldTrigger method
		(UserCondition as jest.MockedClass<typeof UserCondition>).mockImplementation(() => {
			return {
				shouldTrigger: jest.fn().mockImplementation(() => Promise.resolve(false)),
			} as unknown as UserCondition;
		});
	});

	beforeEach(() => {
		// Reset mocks before each test
		jest.clearAllMocks();
		oneConditionShouldTriggerResponse = false;
	});

	describe('bot configuration', () => {
		it('should have correct name', () => {
			// Arrange
			const guyBot = createGuyBot(mockWebhookService as unknown as WebhookService);

			// Act
			const identity = guyBot.getIdentity();

			// Assert
			expect(identity.name).toBe('GuyBot');
		});

		it('should have correct avatar URL', () => {
			// Arrange
			const guyBot = createGuyBot(mockWebhookService as unknown as WebhookService);

			// Act
			const identity = guyBot.getIdentity();

			// Assert
			expect(identity.avatarUrl).toBe('https://i.pinimg.com/originals/dc/39/85/dc3985a3ac127397c53bf8c3a749b011.jpg');
		});
	});

	describe('message handling', () => {
		it('should ignore messages from bots', async () => {
			// Arrange: Create bot message
			const guyBot = createGuyBot(mockWebhookService as unknown as WebhookService);
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			const mockMessage = createMockMessage('BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			mockMessage.content = 'guy';

			// Act: Process the message
			await guyBot.handleMessage(mockMessage as Message<boolean>);

			// Assert: Verify bot did not respond
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "guy" when pattern condition triggers', async () => {
			// Arrange: Create message with trigger word and set condition to trigger
			const guyBot = createGuyBot(mockWebhookService as unknown as WebhookService);
			const mockMessage = createMockMessage('TestUser');
			mockMessage.content = 'guy';
			oneConditionShouldTriggerResponse = true;

			// Act: Process the message
			await guyBot.handleMessage(mockMessage as Message<boolean>);

			// Assert: Verify correct response was sent
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'GuyBot',
					avatarURL: 'https://i.pinimg.com/originals/dc/39/85/dc3985a3ac127397c53bf8c3a749b011.jpg',
					content: expect.any(String)
				})
			);
		});

		it('should respond to messages from Guy', async () => {
			// Arrange: Create a message from Guy
			const guyBot = createGuyBot(mockWebhookService as unknown as WebhookService);
			const mockMessage = createMockMessage('Guy');
			const mockGuyMember = createMockGuildMember('guy-user-id', 'Guy');
			mockMessage.author = mockGuyMember.user as User;
			Object.defineProperty(mockMessage.author, 'id', {
				value: 'guy-user-id',
				configurable: true
			});
			mockMessage.content = 'Hello everyone!';
			oneConditionShouldTriggerResponse = true;

			// Act: Process the message
			await guyBot.handleMessage(mockMessage as Message<boolean>);

			// Assert: Verify bot responded with Guy's identity
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
			// Arrange: Create message that doesn't trigger conditions
			const guyBot = createGuyBot(mockWebhookService as unknown as WebhookService);
			const mockMessage = createMockMessage('TestUser');
			mockMessage.content = 'Hello there!';
			oneConditionShouldTriggerResponse = false;

			// Act: Process the message
			await guyBot.handleMessage(mockMessage as Message<boolean>);

			// Assert: Verify no response was sent
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
