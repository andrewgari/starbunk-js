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

jest.mock('@/openai/openaiClient', () => ({
	OpenAIClient: {
		detectBlueReference: jest.fn().mockResolvedValue(true)
	}
}));

// Create variables to control mock behaviors
let cooldownShouldTriggerResponse = true;

jest.mock('../../../starbunk/bots/triggers/conditions/cooldownCondition', () => {
	return {
		CooldownCondition: jest.fn().mockImplementation(() => ({
			shouldTrigger: jest.fn().mockImplementation(() => Promise.resolve(cooldownShouldTriggerResponse))
		}))
	};
});

// Create a timestamp variable for testing
let mockBluMessageTimestamp = 0;
let mockLastAvatarUrl = 'https://imgur.com/WcBRCWn.png'; // Default avatar

// Mock the botStateService to control the timestamp and avatar URL
jest.mock('../../../services/botStateService', () => ({
	botStateService: {
		setState: jest.fn().mockImplementation((key, value) => {
			if (key === 'bluebot_last_avatar') {
				mockLastAvatarUrl = value;
			}
		}),
		getState: jest.fn().mockImplementation((key, defaultValue) => {
			if (key === 'bluebot_last_initial_message_time') {
				return mockBluMessageTimestamp;
			}
			if (key === 'bluebot_last_avatar') {
				return mockLastAvatarUrl;
			}
			return defaultValue;
		})
	}
}));

jest.mock('../../../discord/userID', () => ({
	Venn: 'venn-user-id'
}));

// Real imports after all mocks
import { Message, TextChannel, User } from 'discord.js';
import { botStateService } from '../../../services/botStateService';
import { BLUEBOT_TIMESTAMP_KEY, BlueBot, createBlueBot } from '../../../starbunk/bots/reply-bots/blueBot';
import webhookService from '../../../webhooks/webhookService';
import { createMockGuildMember, createMockMessage } from '../../mocks/discordMocks';

describe('BlueBot', () => {
	let blueBot: BlueBot;
	let mockMessage: Partial<Message<boolean>>;

	// Helper to set timestamps for testing
	const setLastMessageTime = (minutesAgo: number | null): void => {
		if (minutesAgo === null) {
			mockBluMessageTimestamp = 0;
		} else {
			const msAgo = minutesAgo * 60 * 1000;
			mockBluMessageTimestamp = Date.now() - msAgo;
		}
	};

	beforeEach(() => {
		// Reset all mocks
		jest.clearAllMocks();

		// Reset variables
		mockBluMessageTimestamp = 0;
		mockLastAvatarUrl = 'https://imgur.com/WcBRCWn.png'; // Default avatar
		cooldownShouldTriggerResponse = true;

		// Create message mock
		mockMessage = createMockMessage('TestUser');
		if (mockMessage.author) {
			Object.defineProperty(mockMessage.author, 'displayName', {
				value: 'TestUser',
				configurable: true
			});
		}

		// Create bot instance
		blueBot = createBlueBot();
	});

	describe('bot configuration', () => {
		it('should have correct name', () => {
			// Act
			const identity = blueBot.getIdentity();

			// Assert
			expect(identity.name).toBe('BlueBot');
		});

		it('should have correct default avatar URL', () => {
			// Act
			const identity = blueBot.getIdentity();

			// Assert
			expect(identity.avatarUrl).toBe('https://imgur.com/WcBRCWn.png');
		});
	});

	describe('message handling', () => {
		it('should ignore messages from bots', async () => {
			// Arrange
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			mockMessage.content = 'blue';

			// Act
			await blueBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "blue" with default message', async () => {
			// Arrange
			mockMessage.content = 'blue';

			// Act
			await blueBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'BlueBot',
					avatarURL: 'https://imgur.com/WcBRCWn.png',
					content: 'Did somebody say Blu'
				})
			);
			expect(botStateService.setState).toHaveBeenCalledWith(
				BLUEBOT_TIMESTAMP_KEY,
				expect.any(Number)
			);
		});

		it('should respond to "bluebot, say something nice about TestUser"', async () => {
			// Arrange
			mockMessage.content = 'bluebot, say something nice about TestUser';

			// Act
			await blueBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'BlueBot',
					avatarURL: 'https://imgur.com/WcBRCWn.png',
					content: 'TestUser, I think you\'re really blu! :wink:'
				})
			);
		});

		it('should respond to "bluebot, say something nice about me"', async () => {
			// Arrange
			mockMessage.content = 'bluebot, say something nice about me';
			const mockMember = createMockGuildMember('user-id', 'TestUser');
			Object.defineProperty(mockMember, 'displayName', {
				value: 'TestUser',
				configurable: true
			});
			Object.defineProperty(mockMessage, 'member', {
				value: mockMember,
				configurable: true
			});

			// Act
			await blueBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'BlueBot',
					avatarURL: 'https://imgur.com/WcBRCWn.png',
					content: 'TestUser, I think you\'re really blu! :wink:'
				})
			);
		});

		it('should respond to "bluebot say something mean about venn" with special message', async () => {
			// Arrange
			mockMessage.content = 'bluebot say something nice about venn';
			const mockMember = createMockGuildMember('user-id', 'TestUser');
			Object.defineProperty(mockMember, 'displayName', {
				value: 'TestUser',
				configurable: true
			});
			Object.defineProperty(mockMessage, 'member', {
				value: mockMember,
				configurable: true
			});
			// Act
			await blueBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'BlueBot',
					avatarURL: 'https://imgur.com/WcBRCWn.png',
					content: 'No way, Venn can suck my blu cane'
				})
			);
		});

		it('should respond to mean messages from Venn with Navy Seal copypasta when in time window', async () => {
			// Arrange
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
			setLastMessageTime(3); // 3 minutes ago

			// Act
			await blueBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'BlueBot',
					avatarURL: 'https://i.imgur.com/dO4a59n.png',
					content: expect.stringContaining('What the fuck did you just fucking say about me')
				})
			);
		});

		it('should NOT respond with Navy Seal copypasta if outside time window', async () => {
			// Arrange
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
			setLastMessageTime(10); // 10 minutes ago (outside 5 min window)

			// Act
			await blueBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			// The bot still responds, but not with the Navy Seal copypasta
			expect(webhookService.writeMessage).not.toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					content: expect.stringContaining('What the fuck did you just fucking say about me')
				})
			);

			// It responds with the default message for "blue" mention
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					content: 'Did somebody say Blu'
				})
			);
		});

		it('should NOT respond with Navy Seal copypasta if CooldownCondition is false', async () => {
			// Arrange
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
			setLastMessageTime(3); // 3 minutes ago

			// Make the cooldown condition return false
			cooldownShouldTriggerResponse = false;

			// Act
			await blueBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			// The bot still responds, but not with the Navy Seal copypasta
			expect(webhookService.writeMessage).not.toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					content: expect.stringContaining('What the fuck did you just fucking say about me')
				})
			);

			// It responds with the cheeky message when in the time window
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'BlueBot',
					avatarURL: 'https://i.imgur.com/dO4a59n.png',
					content: expect.any(String)
				})
			);
		});

		it('should NOT respond to unrelated messages', async () => {
			// Arrange
			mockMessage.content = 'Hello there!';

			// Act
			await blueBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "blue bot" in the message', async () => {
			// Arrange
			mockMessage.content = 'Have you seen blue bot?';

			// Act
			await blueBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'BlueBot',
					content: 'Did somebody say Blu'
				})
			);
			expect(botStateService.setState).toHaveBeenCalledWith(
				BLUEBOT_TIMESTAMP_KEY,
				expect.any(Number)
			);
		});
	});

	describe('conversation flow with timestamps', () => {
		it('should store timestamp when sending initial response', async () => {
			// Arrange
			mockMessage.content = 'blue';

			// Act
			await blueBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					content: 'Did somebody say Blu'
				})
			);
			expect(botStateService.setState).toHaveBeenCalledWith(
				BLUEBOT_TIMESTAMP_KEY,
				expect.any(Number)
			);
		});

		it('should respond with cheeky message when blue is mentioned within 5 minutes of initial message', async () => {
			// Arrange
			setLastMessageTime(3); // 3 minutes ago
			mockMessage.content = 'blue bot is cool';

			// Act
			await blueBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'BlueBot',
					avatarURL: 'https://i.imgur.com/dO4a59n.png',
					content: expect.any(String)
				})
			);
		});

		it('should respond with cheeky message when acknowledgment is sent within 5 minutes of initial message', async () => {
			// Arrange
			setLastMessageTime(3); // 3 minutes ago
			mockMessage.content = 'yes, someone said blue';

			// Act
			await blueBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'BlueBot',
					avatarURL: 'https://i.imgur.com/dO4a59n.png',
					content: expect.any(String)
				})
			);
		});

		it('should NOT respond with cheeky message when outside the 5 minute window', async () => {
			// Arrange
			setLastMessageTime(10); // 10 minutes ago (outside 5 min window)
			mockMessage.content = 'blue bot is cool';

			// Act
			await blueBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					content: expect.stringMatching(/Somebody definitely said blu|.*BLU.*/)
				})
			);
		});

		it('should handle first-time activation correctly', async () => {
			// Arrange
			mockBluMessageTimestamp = 0; // Never activated before
			mockMessage.content = 'blue';

			// Act
			await blueBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					content: 'Did somebody say Blu'
				})
			);
			expect(botStateService.setState).toHaveBeenCalledWith(
				BLUEBOT_TIMESTAMP_KEY,
				expect.any(Number)
			);
		});

		it('should follow the expected conversation sequence', async () => {
			// Reset mocks and state before each message
			const expectResponse = async (message: string, expectedResponse: string | null, expectedAvatar?: string): Promise<void> => {
				jest.clearAllMocks();
				mockMessage.content = message;
				await blueBot.handleMessage(mockMessage as Message<boolean>);

				if (expectedResponse === null) {
					// Expect no response
					expect(webhookService.writeMessage).not.toHaveBeenCalled();
				} else if (expectedResponse === 'cheeky') {
					// For cheeky responses, just check that a response was sent
					expect(webhookService.writeMessage).toHaveBeenCalledWith(
						mockMessage.channel as TextChannel,
						expect.objectContaining({
							...(expectedAvatar && { avatarURL: expectedAvatar }),
							content: expect.any(String)
						})
					);
				} else {
					// Expect specific response
					expect(webhookService.writeMessage).toHaveBeenCalledWith(
						mockMessage.channel as TextChannel,
						expect.objectContaining({
							content: expectedResponse,
							...(expectedAvatar && { avatarURL: expectedAvatar })
						})
					);
				}
			};

			// 1. Send "blu" expect "Did somebody say Blu"
			// This should set the timestamp
			setLastMessageTime(null); // Reset timestamp
			await expectResponse('blu', 'Did somebody say Blu', 'https://imgur.com/WcBRCWn.png');

			// 2. Send "blu" expect cheeky response
			// The timestamp should be recent, so it should trigger the cheeky response
			setLastMessageTime(1); // 1 minute ago
			await expectResponse('blu', 'cheeky', 'https://i.imgur.com/dO4a59n.png');

			// 3. Send "blu" expect "Did somebody say Blu"
			// This should reset the timestamp
			setLastMessageTime(null); // Reset timestamp
			await expectResponse('blu', 'Did somebody say Blu', 'https://imgur.com/WcBRCWn.png');

			// 4. Send "yes" expect cheeky response
			// The timestamp should be recent, so it should trigger the cheeky response
			setLastMessageTime(1); // 1 minute ago
			await expectResponse('yes', 'cheeky', 'https://i.imgur.com/dO4a59n.png');

			// 5. Send "blu" expect "Did somebody say Blu"
			// This should reset the timestamp
			setLastMessageTime(null); // Reset timestamp
			await expectResponse('blu', 'Did somebody say Blu', 'https://imgur.com/WcBRCWn.png');

			// 6. Send "blu" expect cheeky response
			// The timestamp should be recent, so it should trigger the cheeky response
			setLastMessageTime(1); // 1 minute ago
			await expectResponse('blu', 'cheeky', 'https://i.imgur.com/dO4a59n.png');

			// 7. Send "yes" expect NO RESPONSE
			// This should fail if the bot responds, as it should not respond to "yes" without a recent "blu" message
			setLastMessageTime(10); // Set timestamp to be outside the 5-minute window
			await expectResponse('yes', null);

			// 8. Send "blu" expect "Did somebody say Blu"
			// Reset the timestamp to simulate a new conversation
			setLastMessageTime(null);
			await expectResponse('blu', 'Did somebody say Blu', 'https://imgur.com/WcBRCWn.png');
		});
	});

	describe('avatar management', () => {
		it('should use the correct avatar for initial blue message', async () => {
			// Arrange
			mockMessage.content = 'blue';

			// Act
			await blueBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					avatarURL: 'https://imgur.com/WcBRCWn.png'
				})
			);
		});

		it('should use the cheeky avatar for follow-up blue messages', async () => {
			// Arrange
			setLastMessageTime(3); // 3 minutes ago
			mockMessage.content = 'blue';

			// Act
			await blueBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					avatarURL: 'https://i.imgur.com/dO4a59n.png'
				})
			);
		});

		it('should use the correct avatar for Navy Seal response', async () => {
			// Arrange
			const mockVennMember = createMockGuildMember('venn-user-id', 'Venn');
			mockMessage.author = mockVennMember.user as User;
			Object.defineProperty(mockMessage.author, 'id', {
				value: 'venn-user-id',
				configurable: true
			});
			mockMessage.content = 'I hate blue, it\'s the worst bot ever';
			setLastMessageTime(3); // 3 minutes ago

			// Act
			await blueBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					avatarURL: 'https://i.imgur.com/dO4a59n.png'
				})
			);
		});

		it('should use the correct avatar for mean response about Venn', async () => {
			// Arrange
			mockMessage.content = 'bluebot say something nice about venn';

			// Act
			await blueBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'BlueBot',
					content: 'No way, Venn can suck my blu cane',
					avatarURL: 'https://imgur.com/WcBRCWn.png'
				})
			);
		});
	});
});
