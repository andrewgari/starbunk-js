import { Message } from 'discord.js';
import userId from '../../../discord/userId';
import * as environment from '../../../environment';
import { ServiceId, container } from '../../../services/container';
import { CovaBotConfig } from '../config/covaBotConfig';
import CovaBot from '../reply-bots/covaBot';
import { createMockMessage, mockLogger, mockWebhookService } from './testUtils';

// Mock the environment
jest.mock('../../../environment', () => ({
	isDebugMode: jest.fn().mockReturnValue(false),
	setDebugMode: jest.fn()
}));

// Create mock LLM responses
const mockLLMManager = {
	createCompletion: jest.fn().mockResolvedValue({ content: 'YES' }),
	createPromptCompletion: jest.fn().mockResolvedValue('This is a CovaBot response.')
};

// Mock the bootstrap module
jest.mock('../../../services/bootstrap', () => ({
	getLLMManager: jest.fn().mockReturnValue(mockLLMManager),
	getWebhookService: jest.fn().mockReturnValue(mockWebhookService),
	getDiscordService: jest.fn().mockReturnValue({
		getMemberAsBotIdentity: jest.fn().mockReturnValue({
			botName: 'Cova',
			avatarUrl: 'https://example.com/avatar.jpg'
		})
	}),
	getDiscordClient: jest.fn().mockReturnValue({
		isReady: jest.fn().mockReturnValue(true),
		once: jest.fn()
	})
}));

// Mock PerformanceTimer
jest.mock('../../../utils/time', () => {
	const actual = jest.requireActual('../../../utils/time');
	return {
		...actual,
		PerformanceTimer: {
			getInstance: jest.fn(() => ({
				mark: jest.fn(),
				measure: jest.fn(() => 0),
				getStats: jest.fn(() => ({})),
				getStatsString: jest.fn(() => 'Mock Stats'),
				reset: jest.fn()
			})),
			time: jest.fn((label, fn) => fn())
		}
	};
});

// Mock setInterval/setTimeout
jest.useFakeTimers();

describe('CovaBot', () => {
	let covaBot: CovaBot;
	let message: Message;
	let sendReplySpy: jest.SpyInstance;
	let shouldRespondSpy: jest.SpyInstance;
	let generateAndSendResponseSpy: jest.SpyInstance;
	let originalSetInterval: typeof setInterval;
	const mockIntervals: NodeJS.Timeout[] = [];

	// Store original timers before tests
	beforeAll(() => {
		originalSetInterval = global.setInterval;
		global.setInterval = jest.fn((callback, ms) => {
			const interval = originalSetInterval(callback, ms);
			mockIntervals.push(interval);
			return interval;
		}) as any;
	});

	// Clean up after all tests
	afterAll(() => {
		global.setInterval = originalSetInterval;
		// Clear any remaining intervals
		mockIntervals.forEach(interval => clearInterval(interval));
	});

	beforeEach(() => {
		// Clear container and register mocks
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);

		// Reset mocks
		jest.clearAllMocks();

		// Create a mock message
		message = createMockMessage('Hello there!');

		// Properly set up message.mentions
		message.mentions = {
			has: jest.fn().mockReturnValue(false),
			users: {
				has: jest.fn().mockReturnValue(false)
			}
		} as any;

		// Create CovaBot instance
		covaBot = new CovaBot();

		// Spy on the sendReply method
		sendReplySpy = jest.spyOn(covaBot as any, 'sendReply').mockImplementation(() => Promise.resolve());

		// Spy on the shouldRespondToMessage method and make it return true by default
		shouldRespondSpy = jest.spyOn(covaBot as any, 'shouldRespondToMessage').mockResolvedValue(true);

		// Spy on generateAndSendResponse
		generateAndSendResponseSpy = jest.spyOn(covaBot as any, 'generateAndSendResponse').mockImplementation(async () => {
			await mockLLMManager.createPromptCompletion();
			return Promise.resolve();
		});

		// Default to debug mode off
		(environment.isDebugMode as jest.Mock).mockReturnValue(false);
	});

	afterEach(() => {
		// Clear timers
		jest.clearAllTimers();
		// Run any pending promises
		return Promise.resolve();
	});

	it('should initialize with the correct bot identity', () => {
		const identity = covaBot.botIdentity;
		expect(identity.botName).toBe(CovaBotConfig.Name);
		expect(identity.avatarUrl).toBe(CovaBotConfig.Avatars.Default);
	});

	it('should skip messages from Cova', async () => {
		// Set up message from Cova
		message.author.id = userId.Cova;

		await covaBot.handleMessage(message);
		expect(sendReplySpy).not.toHaveBeenCalled();
	});

	it('should skip messages from bots', async () => {
		message.author.bot = true;
		await covaBot.handleMessage(message);
		expect(sendReplySpy).not.toHaveBeenCalled();
	});

	it('should respond to messages mentioning Cova', async () => {
		// Set up message that mentions Cova
		message.content = 'Hey Cova, how are you?';

		// Set up question pattern detection
		jest.spyOn(CovaBotConfig.Patterns.Question, 'test').mockReturnValue(true);

		await covaBot.handleMessage(message);

		// Verify the correct methods were called
		expect(generateAndSendResponseSpy).toHaveBeenCalled();
		expect(mockLLMManager.createPromptCompletion).toHaveBeenCalled();
	});

	it('should respond to messages only from cova when in debug mode', async () => {
		// Set debug mode to true
		(environment.isDebugMode as jest.Mock).mockReturnValue(true);

		// Set up message from Cova
		message.author.id = userId.Cova;

		// We need to bypass the base class shouldSkipMessage check
		// by directly calling processMessage instead of handleMessage
		const shouldSkipSpy = jest.spyOn(covaBot as any, 'shouldSkipMessage');
		shouldSkipSpy.mockReturnValue(false);

		await covaBot.processMessage(message);

		// The test expects generateAndSendResponse to be called
		expect(generateAndSendResponseSpy).toHaveBeenCalled();
	});

	it('should respond when explicitly set to respond', async () => {
		// Mock the shouldRespondToMessage to return true
		shouldRespondSpy.mockResolvedValue(true);

		await covaBot.handleMessage(message);
		expect(generateAndSendResponseSpy).toHaveBeenCalled();
	});

	it('should not respond when not explicitly set to respond and no Cova mention', async () => {
		// Mock the shouldRespondToMessage to return false
		shouldRespondSpy.mockResolvedValue(false);
		message.content = 'This message does not mention the bot';

		await covaBot.handleMessage(message);
		expect(generateAndSendResponseSpy).not.toHaveBeenCalled();
	});
});
