import { patchReplyBot } from '@/__tests__/helpers/replyBotHelper';
import { createMockMessage } from '@/__tests__/mocks/discordMocks';
import { createMockWebhookService } from '@/__tests__/mocks/serviceMocks';
import createBlueBot from '@/starbunk/bots/reply-bots/blueBot';
import ReplyBot from '@/starbunk/bots/replyBot';
import { Collection, GuildMember, Message, TextChannel, User } from 'discord.js';

// Import the response constants from the blueBot file
const RESPONSES = {
	BASIC_MENTION: "Did somebody say Blu?",
	ACKNOWLEDGMENT: "Lol, Somebody definitely said Blu! :smile:",
	NAVY_SEAL: "What the blu did you just blueing say about me, you little blu? I'll have you know I graduated top of my class in the Navy Blus...",
	VENN_INSULT: "No way, Venn can suck my blu cane. :unamused:"
};

// Create a mock for the TimeDelayCondition
const mockShouldTrigger = jest.fn();

// Mock the TimeDelayCondition
jest.mock('@/starbunk/bots/conditions', () => {
	const originalModule = jest.requireActual('@/starbunk/bots/conditions');

	return {
		...originalModule,
		TimeDelayCondition: jest.fn().mockImplementation(() => ({
			shouldTrigger: mockShouldTrigger,
			updateLastTime: jest.fn()
		}))
	};
});

describe('BlueBot', () => {
	let blueBot: ReplyBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;

	// Helper function to create mock Discord users with default values
	const createMockUser = (overrides = {}): User => ({
		id: 'default-id',
		bot: false,
		displayName: 'TestUser',
		username: 'TestUser',
		...overrides
	} as unknown as User);

	beforeEach(() => {
		// Reset the mock implementation for each test
		mockShouldTrigger.mockReset();
		// Default to false (no recent messages)
		mockShouldTrigger.mockResolvedValue(false);

		mockWebhookService = createMockWebhookService();
		mockMessage = {
			...createMockMessage('TestUser'),
			author: createMockUser(),
			member: {
				displayName: 'TestUser',
				_roles: [],
				roles: { cache: new Collection() }
			} as unknown as GuildMember
		};

		blueBot = createBlueBot({ webhookService: mockWebhookService, useAIDetection: false });

		// Patch the bot for testing
		patchReplyBot(blueBot, mockWebhookService);
	});

	describe('message handling', () => {
		// Test bot's message filtering
		it('should ignore messages from bots', async () => {
			mockMessage.author = createMockUser({ bot: true });
			await blueBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		// Test basic trigger word response
		it('should respond to direct "blue" mention', async () => {
			// Ensure the time condition returns false (no recent messages)
			mockShouldTrigger.mockResolvedValue(false);

			mockMessage.content = 'hey blue';
			await blueBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					content: RESPONSES.BASIC_MENTION,
					avatarURL: expect.any(String)
				})
			);
		});

		// Test confirmation responses
		it('should respond to confirmation messages', async () => {
			// First message to trigger blue - should get basic response
			mockShouldTrigger.mockResolvedValue(false);
			mockMessage.content = 'blue';
			await blueBot.handleMessage(mockMessage as Message<boolean>);

			// Reset the mock to clear previous calls
			mockWebhookService.writeMessage.mockClear();

			// For the second message, make the time condition return true
			// to simulate that a previous message was sent within the time window
			mockShouldTrigger.mockResolvedValue(true);

			// Second message to trigger the acknowledgment response
			mockMessage.content = 'blue again';
			await blueBot.handleMessage(mockMessage as Message<boolean>);

			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					content: RESPONSES.ACKNOWLEDGMENT,
					avatarURL: expect.any(String)
				})
			);
		});

		describe('nice/mean requests', () => {
			// Test positive response for regular users
			it('should respond nicely about regular users', async () => {
				mockMessage.content = 'blubot, say something nice about TestUser';
				await blueBot.handleMessage(mockMessage as Message<boolean>);

				expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
					mockMessage.channel as TextChannel,
					expect.objectContaining({
						content: 'TestUser, I think you\'re pretty Blu! :wink:',
						avatarURL: expect.any(String)
					})
				);
			});

			// Test mean response for Venn
			it('should respond with contempt to requests about Venn', async () => {
				mockMessage.content = 'bluebot, say something nice about venn';
				await blueBot.handleMessage(mockMessage as Message<boolean>);

				expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
					mockMessage.channel as TextChannel,
					expect.objectContaining({
						content: RESPONSES.VENN_INSULT,
						avatarURL: expect.any(String)
					})
				);
			});

			// Test "me" handling in nice requests
			it('should handle "me" in nice requests', async () => {
				mockMessage = {
					...mockMessage,
					member: {
						...mockMessage.member,
						displayName: 'TestMember'
					} as GuildMember
				};
				mockMessage.content = 'blubot, say something nice about me';
				await blueBot.handleMessage(mockMessage as Message<boolean>);

				expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
					mockMessage.channel as TextChannel,
					expect.objectContaining({
						content: 'TestMember, I think you\'re pretty Blu! :wink:',
						avatarURL: expect.any(String)
					})
				);
			});
		});
	});

	describe('avatar changes', () => {
		// Test default avatar for basic blue mention
		it('should use default avatar for basic blue mention', async () => {
			mockMessage.content = 'hey blue';
			await blueBot.handleMessage(mockMessage as Message<boolean>);

			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					content: RESPONSES.BASIC_MENTION,
					avatarURL: 'https://imgur.com/WcBRCWn.png'
				})
			);
		});

		// Test cheeky avatar for acknowledgment responses
		it('should use cheeky avatar for acknowledgment responses', async () => {
			// First message to trigger blue
			mockShouldTrigger.mockResolvedValue(false);
			mockMessage.content = 'blue';
			await blueBot.handleMessage(mockMessage as Message<boolean>);

			// Reset the mock to clear previous calls
			mockWebhookService.writeMessage.mockClear();

			// For the second message, make the time condition return true
			mockShouldTrigger.mockResolvedValue(true);

			// Second message to trigger the acknowledgment response with a "yes" to trigger cheeky avatar
			mockMessage.content = 'yes blue again';
			await blueBot.handleMessage(mockMessage as Message<boolean>);

			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					content: RESPONSES.ACKNOWLEDGMENT,
					avatarURL: 'https://i.imgur.com/dO4a59n.png'
				})
			);
		});

		// Test murder avatar for navy seal response
		it('should use murder avatar for navy seal response', async () => {
			// Mock the TimeDelayCondition for the navy seal response
			mockShouldTrigger.mockImplementation(() => Promise.resolve(true));

			// Use a message with negative words to trigger murder avatar
			mockMessage.content = 'blue is shit';
			await blueBot.handleMessage(mockMessage as Message<boolean>);

			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					avatarURL: 'https://imgur.com/Tpo8Ywd.jpg'
				})
			);
		});

		// Test murder avatar for Venn insult
		it('should use murder avatar for Venn insult', async () => {
			mockMessage.content = 'bluebot, say something nice about venn';
			await blueBot.handleMessage(mockMessage as Message<boolean>);

			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					content: RESPONSES.VENN_INSULT,
					avatarURL: 'https://i.imgur.com/dO4a59n.png'
				})
			);
		});
	});
});
