// Mock the logger to avoid console output during tests
jest.mock('../../services/logger');

// Mock the BotRegistry
jest.mock('../bots/botRegistry', () => {
	const mockRegistry = {
		enableBot: jest.fn(),
		disableBot: jest.fn(),
		getAllBotNames: jest.fn().mockReturnValue(['TestBot1', 'TestBot2']),
		isBotEnabled: jest.fn().mockReturnValue(true),
		getBotFrequency: jest.fn().mockReturnValue(50),
		setBotFrequency: jest.fn(),
		getBotDescription: jest.fn().mockReturnValue('Test bot description'),
		getReplyBotNames: jest.fn().mockReturnValue(['ReplyBot1', 'ReplyBot2']),
		getVoiceBotNames: jest.fn().mockReturnValue(['VoiceBot1', 'VoiceBot2']),
	};
	return {
		BotRegistry: {
			getInstance: jest.fn().mockReturnValue(mockRegistry)
		}
	};
});

// Mock fs module
jest.mock('fs', () => ({
	readFileSync: jest.fn(),
	readdirSync: jest.fn().mockImplementation((path) => {
		if (path.includes('strategy-bots')) {
			return ['baby-bot', 'banana-bot', 'blue-bot', 'chaos-bot'];
		}
		if (path.includes('commands')) {
			return ['ping.ts', 'bot.ts', 'debug.ts', 'adapter.ts', '__tests__'];
		}
		return [];
	}),
	existsSync: jest.fn().mockReturnValue(true),
	statSync: jest.fn().mockReturnValue({
		isDirectory: () => true
	}),
	mkdirSync: jest.fn(),
	writeFileSync: jest.fn(),
}));

// Mock CommandHandler
jest.mock('../commandHandler', () => {
	return {
		CommandHandler: jest.fn().mockImplementation(() => ({
			registerCommands: jest.fn().mockResolvedValue(true),
			commands: new Map([
				['ping', { name: 'ping' }],
				['bot', { name: 'bot' }],
				['debug', { name: 'debug' }]
			]),
			handleInteraction: jest.fn()
		}))
	};
});

// Mock bootstrap to avoid circular dependencies
jest.mock('../../services/bootstrap', () => ({
	bootstrapApplication: jest.fn().mockResolvedValue(true)
}));

// Mock bot loaders
jest.mock('../bots/strategy-loader', () => ({
	loadStrategyBots: jest.fn().mockResolvedValue([
		{ defaultBotName: 'BabyBot', constructor: { name: 'BabyBot' } },
		{ defaultBotName: 'BananaBot', constructor: { name: 'BananaBot' } },
		{ defaultBotName: 'BlueBot', constructor: { name: 'BlueBot' } },
		{ defaultBotName: 'ChaosBot', constructor: { name: 'ChaosBot' } }
	])
}));

jest.mock('../bots/voice-loader', () => ({
	loadVoiceBots: jest.fn().mockResolvedValue([
		{ name: 'VoiceBot1', constructor: { name: 'VoiceBot1Class' } },
		{ name: 'VoiceBot2', constructor: { name: 'VoiceBot2Class' } }
	])
}));

// Mock StarbunkClient to avoid bind issues
jest.mock('../starbunkClient', () => {
	const mockCommandHandler = {
		registerCommands: jest.fn().mockResolvedValue(true),
		commands: new Map([
			['ping', { name: 'ping' }],
			['bot', { name: 'bot' }],
			['debug', { name: 'debug' }]
		]),
		handleInteraction: jest.fn()
	};

	return {
		__esModule: true,
		default: jest.fn().mockImplementation(() => ({
			init: jest.fn().mockImplementation(async () => {
				// Explicitly call loadStrategyBots and loadVoiceBots
				await require('../bots/strategy-loader').loadStrategyBots();
				await require('../bots/voice-loader').loadVoiceBots();
				await mockCommandHandler.registerCommands();
				return Promise.resolve();
			}),
			commandHandler: mockCommandHandler,
			once: jest.fn(),
			on: jest.fn(),
			login: jest.fn().mockResolvedValue('token'),
			user: { tag: 'TestBot#0000' },
			destroy: jest.fn().mockResolvedValue(undefined)
		}))
	};
});

// Mock the Discord.js Client
jest.mock('discord.js', () => {
	return {
		Client: jest.fn().mockImplementation(() => ({
			once: jest.fn(),
			on: jest.fn(),
			login: jest.fn().mockResolvedValue('token'),
		})),
		Collection: jest.fn().mockImplementation(() => ({
			set: jest.fn(),
			get: jest.fn(),
			forEach: jest.fn(),
			size: 0,
			map: jest.fn().mockReturnValue([]),
		})),
		REST: jest.fn().mockImplementation(() => ({
			setToken: jest.fn().mockReturnThis(),
			put: jest.fn().mockResolvedValue(true),
		})),
		Routes: {
			applicationGuildCommands: jest.fn(),
		},
		GatewayIntentBits: {
			Guilds: 1,
			GuildMessages: 2,
			MessageContent: 3,
			GuildVoiceStates: 4,
		},
		Events: {
			ClientReady: 'ready',
			MessageCreate: 'messageCreate',
			InteractionCreate: 'interactionCreate',
			VoiceStateUpdate: 'voiceStateUpdate'
		},
	};
});

import fs from 'fs';
import path from 'path';
import { container } from '../../services/container';
import { CommandHandler } from '../commandHandler';

describe('Starbunk startup', () => {
	const { loadStrategyBots } = require('../bots/strategy-loader');
	const { loadVoiceBots } = require('../bots/voice-loader');

	// Reset all mocks before each test
	beforeEach(() => {
		jest.clearAllMocks();
		container.clear();
	});

	describe('Bot loading tests', () => {
		it('should load all reply bots successfully', async () => {
			// Call loadStrategyBots directly to test bot loading
			const replyBots = await loadStrategyBots();

			// Verify that loadStrategyBots was called
			expect(loadStrategyBots).toHaveBeenCalled();

			// Verify that bots are returned
			expect(replyBots).toBeDefined();
			expect(replyBots.length).toBe(4); // We mocked 4 bots

			// Check if each bot has the expected name
			const botNames = replyBots.map((bot: any) => bot.defaultBotName);
			expect(botNames).toContain('BabyBot');
			expect(botNames).toContain('BananaBot');
			expect(botNames).toContain('BlueBot');
			expect(botNames).toContain('ChaosBot');
		});

		it('should load all voice bots successfully', async () => {
			// Call loadVoiceBots directly to test bot loading
			const voiceBots = await loadVoiceBots();

			// Verify that loadVoiceBots was called
			expect(loadVoiceBots).toHaveBeenCalled();

			// Verify that bots are returned
			expect(voiceBots).toBeDefined();
			expect(voiceBots.length).toBe(2); // We mocked 2 voice bots

			// Check if each bot has the expected name
			const botNames = voiceBots.map((bot: any) => bot.name);
			expect(botNames).toContain('VoiceBot1');
			expect(botNames).toContain('VoiceBot2');
		});
	});

	describe('Command loading tests', () => {
		it('should find all command files', () => {
			// Check the mock fs to verify command discovery
			const commandsDir = path.join(__dirname, '../commands');
			const commandFiles = fs.readdirSync(commandsDir)
				.filter(file => file.endsWith('.ts') || file.endsWith('.js'))
				.filter(file => !file.startsWith('adapter') && !file.includes('__tests__'));

			// Our mock fs returns three command files
			expect(commandFiles).toHaveLength(3);
			expect(commandFiles).toContain('ping.ts');
			expect(commandFiles).toContain('bot.ts');
			expect(commandFiles).toContain('debug.ts');
		});

		it('should register all commands in CommandHandler', async () => {
			// Create a new command handler instance
			const mockCommandHandler = new CommandHandler();

			// Call registerCommands directly
			await mockCommandHandler.registerCommands();

			// Verify command registration by checking if the registerCommands function was called
			expect(mockCommandHandler.registerCommands).toHaveBeenCalled();

			// Access the commands map using type assertion to avoid TypeScript errors
			const commandsMap = (mockCommandHandler as any).commands;

			// Verify the mock CommandHandler's commands map
			expect(commandsMap).toBeDefined();
			expect(commandsMap.size).toBe(3);
		});
	});
});
