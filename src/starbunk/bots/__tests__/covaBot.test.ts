import { Message, TextChannel } from 'discord.js';
import userId from '../../../discord/userId';
import { DiscordService } from '../../../services/discordService';
import CovaBot from '../reply-bots/covaBot';

// Mock environment
jest.mock('../../../environment', () => ({
	isDebugMode: jest.fn().mockReturnValue(false),
	isProduction: false
}));

// Mock timer functions to prevent test hanging
jest.mock('../../../utils/time', () => ({
	...jest.requireActual('../../../utils/time'),
	PerformanceTimer: {
		getInstance: jest.fn().mockReturnValue({
			mark: jest.fn(),
			measure: jest.fn().mockReturnValue(0),
			getStats: jest.fn().mockReturnValue({}),
			getStatsString: jest.fn().mockReturnValue("Mock stats"),
			reset: jest.fn()
		}),
		time: jest.fn().mockImplementation((name, fn) => fn())
	},
	isOlderThan: jest.fn().mockReturnValue(true),
	formatRelativeTime: jest.fn().mockReturnValue("a while ago"),
	TimeUnit: { HOUR: 3600000, MINUTE: 60000, SECOND: 1000 }
}));

// Setup mocks after the imports but before using them
jest.mock('../../../services/discordService', () => {
	const mockProfile = {
		botName: 'Dynamic Cova Name',
		avatarUrl: 'https://dynamic-avatar-url.com/cova.jpg'
	};
	
	return {
		DiscordService: {
			getInstance: jest.fn().mockReturnValue({
				getBotProfile: jest.fn().mockReturnValue(mockProfile),
				sendMessageWithBotIdentity: jest.fn().mockResolvedValue(undefined)
			})
		}
	};
});

jest.mock('../../../services/bootstrap', () => {
	const mockProfile = {
		botName: 'Dynamic Cova Name',
		avatarUrl: 'https://dynamic-avatar-url.com/cova.jpg'
	};
	
	return {
		getDiscordService: jest.fn().mockReturnValue({
			getBotProfile: jest.fn().mockReturnValue(mockProfile)
		}),
		getLLMManager: jest.fn().mockReturnValue({
			createCompletion: jest.fn().mockResolvedValue({ content: 'YES' }),
			createPromptCompletion: jest.fn().mockResolvedValue('Test response')
		})
	};
});

describe('CovaBot', () => {
	let bot: CovaBot;
	let message: Message;
	let discordServiceMock: any;

	beforeEach(() => {
		// Arrange
		jest.clearAllMocks();
		discordServiceMock = DiscordService.getInstance();
		bot = new CovaBot();
		message = {
			id: 'msg123',
			content: 'test message',
			author: {
				id: 'testUser',
				bot: false,
				username: 'testUser',
				tag: 'testUser#1234'
			},
			channel: {
				id: 'channel123',
				name: 'test-channel',
				type: 0
			} as TextChannel,
			channelId: 'channel123',
			mentions: {
				has: jest.fn().mockReturnValue(false)
			},
			client: {
				user: {
					id: 'botUserId'
				}
			}
		} as unknown as Message;
	});

	it('should have a defined bot identity', () => {
		// We're just testing that the bot identity exists
		const botIdentity = bot.botIdentity;
		expect(botIdentity).toBeDefined();
		expect(botIdentity.botName).toBeDefined();
		expect(botIdentity.avatarUrl).toBeDefined();
	});

	it('should skip messages from Cova', async () => {
		// Arrange
		message.author.id = userId.Cova;
		
		// Act
		await bot.handleMessage(message);
		
		// Assert
		expect(discordServiceMock.sendMessageWithBotIdentity).not.toHaveBeenCalled();
	});

	it('should skip messages from bots', async () => {
		// Arrange
		message.author.bot = true;
		
		// Act
		await bot.handleMessage(message);
		
		// Assert
		expect(discordServiceMock.sendMessageWithBotIdentity).not.toHaveBeenCalled();
	});
	
	// Clean up and prevent jest from hanging
	afterAll(() => {
		jest.clearAllTimers();
		jest.useRealTimers();
	});
});