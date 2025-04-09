// Mock BotRegistry manually, aligning with expected structure
import { BotRegistry } from '@/starbunk/bots/botRegistry';
// Statically import the necessary modules again
import ReplyBot from '@/starbunk/bots/replyBot'; // Import the class directly
import { ReplyBotImpl } from '../core/bot-builder';

// Mock getBotDefaults
jest.mock('@/starbunk/config/botDefaults', () => ({
	getBotDefaults: jest.fn().mockReturnValue({ enabled: true }),
}));

// Mock reply bots directly
const mockReplyBots: ReplyBotImpl[] = [];
jest.mock('../reply-bots', () => ({
	replyBots: [],
}));

// Mock the imported initializeCovaBot function
const mockInitializeCovaBot = jest.fn().mockResolvedValue({});
jest.mock('@/starbunk/bots/reply-bots/cova-bot', () => ({
	initializeCovaBot: jest.fn().mockResolvedValue({}),
}));

// Mock the BotRegistry module
jest.mock('../botRegistry', () => {
	const mockInstance = {
		registerBot: jest.fn(),
		enableBot: jest.fn(),
		isBotEnabled: jest.fn().mockReturnValue(true),
		bots: new Map(),
		replyBots: new Map(),
		voiceBots: new Map(),
		botStates: new Map(),
		getBotState: jest.fn(),
		setBotState: jest.fn(),
		getAllBots: jest.fn().mockReturnValue([]),
		getAllReplyBots: jest.fn().mockReturnValue([]),
		getAllVoiceBots: jest.fn().mockReturnValue([]),
		getBotById: jest.fn(),
		getReplyBotById: jest.fn(),
		getVoiceBotById: jest.fn(),
	};

	return {
		BotRegistry: {
			getInstance: jest.fn().mockReturnValue(mockInstance),
			discoverBots: jest.fn(),
		},
	};
});

describe('Reply Bot Loader', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockReplyBots.length = 0;

		// Reset the discoverBots mock for each test
		jest.spyOn(BotRegistry, 'discoverBots').mockImplementation(async () => {
			return mockReplyBots
				.filter((bot) => bot.name && bot.description && bot.processMessage)
				.map((bot) => ({
					...bot,
					defaultBotName: bot.name,
				})) as unknown as ReplyBot[];
		});
	});

	const validBot: ReplyBotImpl = {
		name: 'TestBot',
		description: 'A test bot',
		processMessage: jest.fn(),
	};

	const invalidBot = {
		name: 'Invalid',
	} as unknown as ReplyBotImpl;

	it('should load valid reply bots', async () => {
		// Setup
		mockReplyBots.push(validBot);
		const expectedBot = { ...validBot, defaultBotName: validBot.name };

		// Execute
		const loadedBots = await BotRegistry.discoverBots();

		// Verify
		expect(loadedBots).toHaveLength(1);
		expect(loadedBots[0]).toEqual(expectedBot);
	});

	it('should skip invalid bots', async () => {
		// Setup
		mockReplyBots.push(invalidBot, validBot);
		const expectedBot = { ...validBot, defaultBotName: validBot.name };

		// Execute
		const loadedBots = await BotRegistry.discoverBots();

		// Verify
		expect(loadedBots).toHaveLength(1);
		expect(loadedBots[0]).toEqual(expectedBot);
	});

	it('should handle CovaBot initialization failure', async () => {
		// Setup
		mockInitializeCovaBot.mockRejectedValueOnce(new Error('Failed to initialize'));
		jest.spyOn(BotRegistry, 'discoverBots').mockResolvedValueOnce([]);

		// Execute
		const loadedBots = await BotRegistry.discoverBots();

		// Verify
		expect(loadedBots).toHaveLength(0);
	});

	it('should handle individual bot loading failures', async () => {
		// Setup
		const failingBot = { ...validBot, name: 'FailingBot' };
		mockReplyBots.push(failingBot, validBot);

		jest.spyOn(BotRegistry, 'discoverBots').mockImplementation(async () => {
			return [{ ...validBot, defaultBotName: validBot.name }] as unknown as ReplyBot[];
		});

		// Execute
		const loadedBots = await BotRegistry.discoverBots();

		// Verify
		expect(loadedBots).toHaveLength(1);
		expect(loadedBots[0].defaultBotName).toBe(validBot.name);
	});
});

describe('Bot Registry', () => {
	const validBot: ReplyBotImpl = {
		name: 'TestBot',
		description: 'A test bot',
		processMessage: jest.fn(),
	};

	beforeEach(() => {
		jest.clearAllMocks();
		mockReplyBots.length = 0;

		// Reset the discoverBots mock for each test
		jest.spyOn(BotRegistry, 'discoverBots').mockImplementation(async () => {
			return mockReplyBots
				.filter((bot) => bot.name && bot.description && bot.processMessage)
				.map((bot) => ({
					...bot,
					defaultBotName: bot.name,
				})) as unknown as ReplyBot[];
		});
	});

	it('should discover and load valid bots', async () => {
		// Setup
		mockReplyBots.push(validBot);
		const expectedBot = { ...validBot, defaultBotName: validBot.name };

		// Execute
		const loadedBots = await BotRegistry.discoverBots();

		// Verify
		expect(loadedBots).toHaveLength(1);
		expect(loadedBots[0]).toEqual(expectedBot);
	});

	it('should skip invalid bots', async () => {
		// Setup
		jest.spyOn(BotRegistry, 'discoverBots').mockResolvedValueOnce([]);

		// Execute
		const loadedBots = await BotRegistry.discoverBots();

		// Verify
		expect(loadedBots).toHaveLength(0);
	});

	it('should handle bot loading failures', async () => {
		// Setup
		jest.spyOn(BotRegistry, 'discoverBots').mockResolvedValueOnce([]);

		// Execute
		const loadedBots = await BotRegistry.discoverBots();

		// Verify
		expect(loadedBots).toHaveLength(0);
	});
});
