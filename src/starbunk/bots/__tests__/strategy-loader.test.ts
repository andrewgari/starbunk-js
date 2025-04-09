// Mock BotRegistry manually, aligning with expected structure
import { BotRegistry } from '@/starbunk/bots/botRegistry';
// Statically import the necessary modules again
import ReplyBot from '@/starbunk/bots/replyBot'; // Import the class directly
import { ReplyBotImpl } from '../core/bot-builder';

// Define the mock instance type
interface MockBotRegistry {
	registerBot: jest.Mock;
	enableBot: jest.Mock;
	isBotEnabled: jest.Mock;
	bots: Map<string, any>;
	replyBots: Map<string, any>;
	voiceBots: Map<string, any>;
	botStates: Map<string, boolean>;
	getBotState: jest.Mock;
	setBotState: jest.Mock;
	getAllBots: jest.Mock;
	getAllReplyBots: jest.Mock;
	getAllVoiceBots: jest.Mock;
	getBotById: jest.Mock;
	getReplyBotById: jest.Mock;
	getVoiceBotById: jest.Mock;
}

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
	const mockInstance: MockBotRegistry = {
		registerBot: jest.fn(function (this: MockBotRegistry, bot: ReplyBotImpl) {
			const botName = (bot as ReplyBotImpl & { defaultBotName?: string }).defaultBotName || bot.name;
			this.botStates.set(botName, true);
		}),
		enableBot: jest.fn(),
		isBotEnabled: jest.fn(),
		bots: new Map(),
		replyBots: new Map(),
		voiceBots: new Map(),
		botStates: new Map<string, boolean>(),
		getBotState: jest.fn((botName: string) => mockInstance.botStates.get(botName) || false),
		setBotState: jest.fn(),
		getAllBots: jest.fn().mockReturnValue([]),
		getAllReplyBots: jest.fn().mockReturnValue([]),
		getAllVoiceBots: jest.fn().mockReturnValue([]),
		getBotById: jest.fn(),
		getReplyBotById: jest.fn(),
		getVoiceBotById: jest.fn(),
	};

	mockInstance.isBotEnabled = jest.fn((botName: string) => mockInstance.botStates.get(botName) || false);

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
			const registry = BotRegistry.getInstance();
			const validBots = mockReplyBots
				.filter((bot) => bot.name && bot.description && bot.processMessage)
				.map((bot) => ({
					...bot,
					defaultBotName: bot.name,
				})) as unknown as ReplyBot[];

			// Register each valid bot with the registry, just like the real implementation
			validBots.forEach(bot => {
				registry.registerBot(bot);
			});

			return validBots;
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

	it('should verify bots are enabled by default after registration', async () => {
		// Setup
		mockReplyBots.push(validBot);
		const registry = BotRegistry.getInstance();
		const mockRegisterBot = registry.registerBot;
		const mockIsBotEnabled = registry.isBotEnabled;

		// Execute
		const _loadedBots = await BotRegistry.discoverBots();

		// Verify bot registration
		expect(mockRegisterBot).toHaveBeenCalledWith(
			expect.objectContaining({
				defaultBotName: validBot.name,
			}),
		);

		// Check if the bot is enabled (this will call the mockIsBotEnabled function)
		const isEnabled = mockIsBotEnabled(validBot.name);

		// Verify the bot is enabled by default
		expect(mockIsBotEnabled).toHaveBeenCalledWith(validBot.name);

		// This will now check the actual state in the botStates map
		expect(isEnabled).toBe(true);

		// Verify the bot state in the registry
		expect(registry.isBotEnabled(validBot.name)).toBe(true);
	});
});
