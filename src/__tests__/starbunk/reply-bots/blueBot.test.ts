import { createMockMessage } from '@/__tests__/mocks/discordMocks';
import { createMockWebhookService } from '@/__tests__/mocks/serviceMocks';
import userID from '@/discord/userID';
import { Logger } from '@/services/Logger';
import BlueBot from '@/starbunk/bots/reply-bots/blueBot';
import { Collection, GuildMember, Message, TextChannel, User } from 'discord.js';

// Mock the OpenAIClient module
jest.mock('@/openai/openaiClient', () => ({
	OpenAIClient: {
		chat: {
			completions: {
				create: jest.fn().mockResolvedValue({
					choices: [{ message: { content: 'yes' } }]
				})
			}
		}
	}
}));

// Type definition to access private members of BlueBot for testing
type BlueBotPrivateMembers = {
	blueTimestamp: Date;  // Tracks when "blue" was last mentioned
	blueMurderTimestamp: Date;  // Tracks when the murder copypasta was last used
	getTimestamp(): number;
};

describe('BlueBot', () => {
	// Test suite setup variables
	let blueBot: BlueBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;
	let mockLogger: jest.Mocked<typeof Logger>;
	let mockTime: jest.Mock;
	const NOW = 1000000000000; // Fixed timestamp for consistent time-based testing

	// Helper function to create mock Discord users with default values
	const createMockUser = (overrides = {}): User => ({
		id: 'default-id',
		bot: false,
		displayName: 'TestUser',
		username: 'TestUser',
		...overrides
	} as unknown as User);

	beforeEach(() => {
		mockWebhookService = createMockWebhookService();
		mockLogger = {
			debug: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			info: jest.fn(),
			success: jest.fn(),
			formatMessage: jest.fn(),
			prototype: {} as Logger
		} as unknown as jest.Mocked<typeof Logger>;

		// Setup mock time provider
		mockTime = jest.fn().mockReturnValue(NOW);

		blueBot = new BlueBot(mockWebhookService, mockLogger, {
			timeProvider: mockTime
		});

		mockMessage = {
			...createMockMessage('TestUser'),
			author: createMockUser(),
			member: {
				displayName: 'TestUser',
				_roles: [],
				roles: { cache: new Collection() }
			} as unknown as GuildMember
		};

		// Initialize timestamps to well in the past
		(blueBot as unknown as BlueBotPrivateMembers).blueTimestamp = new Date(Number.MIN_SAFE_INTEGER);
		(blueBot as unknown as BlueBotPrivateMembers).blueMurderTimestamp = new Date(Number.MIN_SAFE_INTEGER);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('bot configuration', () => {
		// Basic configuration tests
		it('should have correct initial name and avatar', () => {
			expect(blueBot.getBotName()).toBe('BluBot');
			expect(blueBot.getAvatarUrl()).toBe('https://imgur.com/WcBRCWn.png');
		});
	});

	describe('message handling', () => {
		// Test bot's message filtering
		it('should ignore messages from bots', () => {
			mockMessage.author = createMockUser({ bot: true });
			blueBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		// Test basic trigger word response
		it('should respond to direct "blue" mention', () => {
			mockMessage.content = 'hey blue';
			blueBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expect.objectContaining({
					content: 'Did somebody say Blu?',
					avatarURL: 'https://imgur.com/WcBRCWn.png'
				})
			);
		});

		// Test conversation chain within time window
		it('should respond to follow-up messages within 5 minutes', () => {
			// First message
			mockMessage.content = 'blue';
			blueBot.handleMessage(mockMessage as Message<boolean>);

			// Simulate 4 minutes passing
			mockTime.mockReturnValue(NOW + 4 * 60 * 1000);

			// Follow-up message
			mockMessage.content = 'yes';
			blueBot.handleMessage(mockMessage as Message<boolean>);

			expect(mockWebhookService.writeMessage).toHaveBeenLastCalledWith(
				mockMessage.channel,
				expect.objectContaining({
					content: 'Lol, Somebody definitely said Blu! :smile:',
					avatarURL: 'https://i.imgur.com/dO4a59n.png'
				})
			);
		});

		// Test conversation timeout
		it('should not respond to follow-up messages after 5 minutes', () => {
			mockMessage.content = 'blue';
			blueBot.handleMessage(mockMessage as Message<boolean>);

			mockWebhookService.writeMessage.mockClear();
			(blueBot as unknown as BlueBotPrivateMembers).blueTimestamp = new Date(NOW);

			mockTime.mockReturnValue(NOW + 6 * 60 * 1000);
			mockMessage.content = 'yes';
			blueBot.handleMessage(mockMessage as Message<boolean>);

			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		describe('Venn interactions', () => {
			// Test special interaction with user "Venn"
			it('should respond with murder copypasta when Venn insults within 2 minutes of blue mention', async () => {
				let blueMessage = {
					avatarURL: 'https://imgur.com/WcBRCWn.png',
					content: expect.stringContaining('Did somebody say Blu?')
				};
				// First blue mention
				mockMessage.content = 'blue';
				await blueBot.handleMessage(mockMessage as Message<boolean>);

				expect(blueMessage).toEqual(expect.objectContaining({
					avatarURL: 'https://imgur.com/WcBRCWn.png',
					content: expect.stringContaining('Did somebody say Blu?')
				}));

				blueMessage = {
					avatarURL: 'https://imgur.com/Tpo8Ywd.jpg',
					content: expect.stringContaining('What the fuck did you just fucking say about me')
				};

				// Venn insults within 2 minutes
				mockTime.mockReturnValue(NOW + 60 * 1000);
				mockMessage.content = 'fuck you bot';
				await blueBot.handleMessage(mockMessage as Message<boolean>);

				expect(blueMessage).toEqual(expect.objectContaining({
					avatarURL: 'https://imgur.com/Tpo8Ywd.jpg',
					content: expect.stringContaining('What the fuck did you just fucking say about me')
				}));
			});

			// Test cooldown period for murder copypasta
			it('should not respond with murder copypasta twice within 24 hours', async () => {
				mockMessage.author = createMockUser({ id: userID.Venn });

				// First blue mention
				mockMessage.content = 'blue';
				await blueBot.handleMessage(mockMessage as Message<boolean>);

				// Simulate 1 minute passing
				mockTime.mockReturnValue(NOW + 60 * 1000);

				// Venn insults
				mockMessage.content = 'fuck you blubot die';
				await blueBot.handleMessage(mockMessage as Message<boolean>);

				// Simulate 5 minutes passing
				mockTime.mockReturnValue(NOW + 5 * 60 * 1000);

				// Another blue mention
				mockMessage.content = 'blue';
				await blueBot.handleMessage(mockMessage as Message<boolean>);

				expect(mockWebhookService.writeMessage).toHaveBeenLastCalledWith(
					mockMessage.channel,
					expect.objectContaining({
						content: 'Did somebody say Blu?',
						avatarURL: 'https://imgur.com/WcBRCWn.png'
					})
				);
			});
		});

		describe('nice/mean requests', () => {
			// Test positive response for regular users
			it('should respond nicely about regular users', () => {
				mockMessage.content = 'blubot, say something nice about TestUser';
				blueBot.handleMessage(mockMessage as Message<boolean>);

				expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
					mockMessage.channel,
					expect.objectContaining({
						content: 'TestUser, I think you\'re pretty Blu! :wink:',
						avatarURL: 'https://i.imgur.com/dO4a59n.png'
					})
				);
			});

			// Test special case response for Venn
			it('should respond with contempt about Venn', () => {
				mockMessage.content = 'blubot, say something nice about Venn';
				blueBot.handleMessage(mockMessage as Message<boolean>);

				expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
					mockMessage.channel,
					expect.objectContaining({
						content: 'No way, Venn can suck my blu cane. :unamused:',
						avatarURL: 'https://imgur.com/WcBRCWn.png'
					})
				);
			});
		});
	});

	describe('isVennInsultingBlu', () => {
		let mockMessage: Partial<Message<boolean>>;

		// Setup mock message before each test in this block
		beforeEach(() => {
			// Replace channel type 'any' with proper type to fix linter error
			mockMessage = {
				...createMockMessage('TestUser'),
				author: createMockUser({ id: userID.Venn }),
				content: 'I hate bots',
				channel: { id: 'mock-channel-id', type: 0 } as TextChannel
			};
		});

		// Test non-Venn user case
		it('returns false for non-Venn users', () => {
			mockMessage = {
				...createMockMessage('TestUser'),
				author: createMockUser({ id: 'someone-else' }),
				content: 'I hate bots',
				channel: { id: 'mock-channel-id', type: 0 } as TextChannel
			};
			expect(blueBot['isVennInsultingBlu'](mockMessage as Message<boolean>)).toBeFalsy();
		});

		it('returns false for non-mean messages', () => {
			mockMessage.content = 'hello there';
			expect(blueBot['isVennInsultingBlu'](mockMessage as Message<boolean>)).toBeFalsy();
		});

		it('returns true when conditions are met', () => {
			// Set up recent blue mention (within 2 minutes)
			(blueBot as unknown as BlueBotPrivateMembers).blueTimestamp = new Date(NOW - 60 * 1000); // 1 minute ago
			// Set murder cooldown expired (over 24 hours)
			(blueBot as unknown as BlueBotPrivateMembers).blueMurderTimestamp = new Date(NOW - 25 * 3600 * 1000);

			expect(blueBot['isVennInsultingBlu'](mockMessage as Message<boolean>)).toBeTruthy();
		});

		it('returns false when blue mention is too old', () => {
			// Set blue mention to 3 minutes ago (outside window)
			(blueBot as unknown as BlueBotPrivateMembers).blueTimestamp = new Date(NOW - 3 * 60 * 1000);
			(blueBot as unknown as BlueBotPrivateMembers).blueMurderTimestamp = new Date(NOW - 25 * 3600 * 1000);

			expect(blueBot['isVennInsultingBlu'](mockMessage as Message<boolean>)).toBeFalsy();
		});

		it('returns false when murder cooldown is active', () => {
			// Set recent blue mention
			(blueBot as unknown as BlueBotPrivateMembers).blueTimestamp = new Date(NOW - 60 * 1000);
			// Set recent murder (within 24 hours)
			(blueBot as unknown as BlueBotPrivateMembers).blueMurderTimestamp = new Date(NOW - 23 * 3600 * 1000);

			expect(blueBot['isVennInsultingBlu'](mockMessage as Message<boolean>)).toBeFalsy();
		});
	});

	describe('timing windows', () => {
		// Test blue response time window logic
		it('correctly checks blue response window', () => {
			(blueBot as unknown as BlueBotPrivateMembers).blueTimestamp = new Date(NOW - 60 * 1000); // 1 minute ago
			expect(blueBot['isWithinBlueResponseWindow']()).toBeTruthy();

			(blueBot as unknown as BlueBotPrivateMembers).blueTimestamp = new Date(NOW - 3 * 60 * 1000); // 3 minutes ago
			expect(blueBot['isWithinBlueResponseWindow']()).toBeFalsy();
		});

		// Test murder copypasta cooldown period
		it('correctly checks murder cooldown', () => {
			(blueBot as unknown as BlueBotPrivateMembers).blueMurderTimestamp = new Date(NOW - 23 * 3600 * 1000); // 23 hours ago
			expect(blueBot['isMurderOffCooldown']()).toBeFalsy();

			(blueBot as unknown as BlueBotPrivateMembers).blueMurderTimestamp = new Date(NOW - 25 * 3600 * 1000); // 25 hours ago
			expect(blueBot['isMurderOffCooldown']()).toBeTruthy();
		});
	});
});
