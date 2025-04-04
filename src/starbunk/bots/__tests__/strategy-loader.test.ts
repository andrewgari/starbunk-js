// Mock BotRegistry manually, aligning with expected structure
const mockRegisterBot = jest.fn();
const mockBotRegistryInstance = { registerBot: mockRegisterBot };
const mockGetInstance = jest.fn(() => mockBotRegistryInstance); // Default mock

jest.mock('../botRegistry', () => ({
	BotRegistry: {
		// Mock getInstance to return the mock function
		getInstance: mockGetInstance
	}
}));

// Mock the imported initializeCovaBot function
const mockInitializeCovaBot = jest.fn().mockResolvedValue({});
jest.mock('../strategy-bots/cova-bot', () => ({
	initializeCovaBot: mockInitializeCovaBot
}));

// Mock strategy bots directly
const mockStrategyBots: StrategyBot[] = [];
jest.mock('../strategy-bots', () => ({ // Mock the named export 'strategyBots'
	strategyBots: mockStrategyBots
}));

// Statically import the necessary modules again
import { StrategyBot } from '../core/bot-builder';
import { StrategyBotLoader } from '../strategy-loader'; // Import the class directly

describe('Strategy Bot Loader', () => {
	// Remove spy variable
	// let initializeCovaBotSpy: jest.SpyInstance;

	const validBot: StrategyBot = {
		name: 'TestBot',
		description: 'A test bot',
		// No metadata needed if validateBot doesn't check it
		processMessage: jest.fn()
	};

	const invalidBot = { // Simulate an invalid structure
		name: 'Invalid'
		// Missing description and processMessage
	} as unknown as StrategyBot;

	beforeEach(() => {
		jest.clearAllMocks();
		mockStrategyBots.length = 0;
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

	it('should load valid strategy bots', async () => {
		// Setup
		mockStrategyBots.push(validBot);

		// Execute by calling the static method on the imported class
		const loadedBots = await StrategyBotLoader.loadBots();

		// Verify
		expect(mockGetInstance).toHaveBeenCalledTimes(1); // Called once for the valid bot
		expect(mockRegisterBot).toHaveBeenCalledTimes(1); // Called by the instance returned by getInstance
		expect(mockRegisterBot).toHaveBeenCalledWith(expect.objectContaining({ defaultBotName: validBot.name })); // Check bot name
		expect(loadedBots).toHaveLength(1);
		expect(loadedBots[0].defaultBotName).toBe(validBot.name);
	});

	it('should skip invalid bots', async () => {
		// Setup
		mockStrategyBots.push(invalidBot, validBot);

		// Execute
		const loadedBots = await StrategyBotLoader.loadBots();

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
		mockStrategyBots.push(validBot);

		// Execute
		const loadedBots = await StrategyBotLoader.loadBots();

		// Verify
		// If initialize fails, the loader might still get the instance, but shouldn't register bots
		expect(mockGetInstance).not.toHaveBeenCalled(); // Should not be called if init fails
		expect(mockRegisterBot).not.toHaveBeenCalled(); // Ensure no bot registration happens
		expect(loadedBots).toHaveLength(0); // No bots should be loaded if init fails
	});

	it('should handle individual bot loading failures', async () => {
		// Setup a bot that causes adaptBot or registerBot to fail
		const failingBot = { ...validBot, name: 'FailingBot' };
		mockStrategyBots.push(failingBot, validBot);

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
		const loadedBots = await StrategyBotLoader.loadBots();

		// Verify
		expect(mockGetInstance).toHaveBeenCalledTimes(2); // Attempted for both bots
		expect(mockRegisterBot).toHaveBeenCalledTimes(1); // Only the second bot (validBot) is registered successfully
		expect(mockRegisterBot).toHaveBeenCalledWith(expect.objectContaining({ defaultBotName: validBot.name }));
		expect(loadedBots).toHaveLength(1);
		expect(loadedBots[0].defaultBotName).toBe(validBot.name); // Only validBot makes it
	});
});
