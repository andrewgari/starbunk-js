// Mock BotRegistry manually, aligning with expected structure
const mockRegisterBot = jest.fn();
const mockBotRegistryInstance = { registerBot: mockRegisterBot };
const mockGetInstance = jest.fn(() => mockBotRegistryInstance); // Default mock

jest.mock('../botRegistry', () => ({
	BotRegistry: {
		// Mock getInstance to return the mock function
		getInstance: mockGetInstance,
	},
}));

// Mock the imported initializeCovaBot function
const mockInitializeCovaBot = jest.fn().mockResolvedValue({});
jest.mock('@/starbunk/bots/reply-bots/cova-bot', () => ({
	initializeCovaBot: mockInitializeCovaBot,
}));

// Mock reply bots directly
const mockReplyBots: ReplyBotImpl[] = [];
jest.mock('../reply-bots', () => ({
	// Mock the named export 'replyBots'
	replyBots: mockReplyBots,
}));

// Statically import the necessary modules again
import { ReplyBotImpl } from '../core/bot-builder';
import { ReplyBotLoader } from '../reply-loader'; // Import the class directly

describe('Reply Bot Loader', () => {
	// Remove spy variable
	// let initializeCovaBotSpy: jest.SpyInstance;

	const validBot: ReplyBotImpl = {
		name: 'TestBot',
		description: 'A test bot',
		// No metadata needed if validateBot doesn't check it
		processMessage: jest.fn(),
	};

	const invalidBot = {
		// Simulate an invalid structure
		name: 'Invalid',
		// Missing description and processMessage
	} as unknown as ReplyBotImpl;

	beforeEach(() => {
		jest.clearAllMocks();
		mockReplyBots.length = 0;
		// Reset getInstance default behavior for each test if needed, though clearAllMocks might cover it
		mockGetInstance.mockClear(); // Explicitly clear calls
		mockGetInstance.mockReturnValue(mockBotRegistryInstance); // Reset to default return value
		// Remove spy setup
		// initializeCovaBotSpy = jest.spyOn(...);
	});

	afterEach(() => {
		// Remove spy restore
		// initializeCovaBotSpy.mockRestore();
	});

	it('should load valid reply bots', async () => {
		// Setup
		mockReplyBots.push(validBot);

		// Execute by calling the static method on the imported class
		const loadedBots = await ReplyBotLoader.loadBots();

		// Verify
		expect(mockGetInstance).toHaveBeenCalledTimes(1); // Called once for the valid bot
		expect(mockRegisterBot).toHaveBeenCalledTimes(1); // Called by the instance returned by getInstance
		expect(mockRegisterBot).toHaveBeenCalledWith(expect.objectContaining({ defaultBotName: validBot.name })); // Check bot name
		expect(loadedBots).toHaveLength(1);
		expect(loadedBots[0].defaultBotName).toBe(validBot.name);
	});

	it('should skip invalid bots', async () => {
		// Setup
		mockReplyBots.push(invalidBot, validBot);

		// Execute
		const loadedBots = await ReplyBotLoader.loadBots();

		// Verify
		expect(mockGetInstance).toHaveBeenCalledTimes(1); // Called only for the valid bot
		expect(mockRegisterBot).toHaveBeenCalledTimes(1); // Only the valid bot is registered
		expect(mockRegisterBot).toHaveBeenCalledWith(expect.objectContaining({ defaultBotName: validBot.name })); // Check bot name
		expect(loadedBots).toHaveLength(1);
		expect(loadedBots[0].defaultBotName).toBe(validBot.name);
	});

	it('should handle CovaBot initialization failure', async () => {
		// Setup mock to reject
		mockInitializeCovaBot.mockRejectedValueOnce(new Error('Failed to initialize'));
		mockReplyBots.push(validBot);

		// Execute
		const loadedBots = await ReplyBotLoader.loadBots();

		// Verify
		// If initialize fails, the loader might still get the instance, but shouldn't register bots
		expect(mockGetInstance).not.toHaveBeenCalled(); // Should not be called if init fails
		expect(mockRegisterBot).not.toHaveBeenCalled(); // Ensure no bot registration happens
		expect(loadedBots).toHaveLength(0); // No bots should be loaded if init fails
	});

	it('should handle individual bot loading failures', async () => {
		// Setup a bot that causes adaptBot or registerBot to fail
		const failingBot = { ...validBot, name: 'FailingBot' };
		mockReplyBots.push(failingBot, validBot);

		// Simulate BotRegistry.getInstance throwing an error for the first bot
		// Clear any default behavior set in beforeEach if necessary
		mockGetInstance.mockClear();
		mockGetInstance
			.mockImplementationOnce(() => {
				// Simulate an error during the adaptation/registration process for the first bot
				throw new Error('Failed to adapt/register');
			})
			.mockImplementationOnce(() => mockBotRegistryInstance); // Succeed for the second bot

		// Execute
		const loadedBots = await ReplyBotLoader.loadBots();

		// Verify
		expect(mockGetInstance).toHaveBeenCalledTimes(2); // Attempted for both bots
		expect(mockRegisterBot).toHaveBeenCalledTimes(1); // Only the second bot (validBot) is registered successfully
		expect(mockRegisterBot).toHaveBeenCalledWith(expect.objectContaining({ defaultBotName: validBot.name }));
		expect(loadedBots).toHaveLength(1);
		expect(loadedBots[0].defaultBotName).toBe(validBot.name); // Only validBot makes it
	});
});