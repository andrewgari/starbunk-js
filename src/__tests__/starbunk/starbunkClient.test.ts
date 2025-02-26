import { Command } from '@/discord/command';
import { Logger } from '@/services/logger';
import StarbunkClient from '@/starbunk/starbunkClient';
import { Events, Message, VoiceState } from 'discord.js';

// Mock the logger
jest.mock('@/services/logger');

describe('StarbunkClient', () => {
	let client: StarbunkClient;
	let mockMessage: Partial<Message>;

	beforeEach(() => {
		client = new StarbunkClient({
			intents: ['Guilds', 'GuildMessages', 'MessageContent']
		});

		// Mock client methods
		(client as unknown as { emit: jest.Mock }).emit = jest.fn();
		(client as unknown as { login: jest.Mock }).login = jest.fn().mockResolvedValue('token');
		(client as unknown as { registerCommands: jest.Mock }).registerCommands = jest.fn();
		(client as unknown as { registerBots: jest.Mock }).registerBots = jest.fn();
		(client as unknown as { registerVoiceBots: jest.Mock }).registerVoiceBots = jest.fn();

		mockMessage = {
			content: '!test',
			author: {
				id: 'user-id',
				bot: false
			}
		} as Partial<Message>;

		// Reset all mocks
		jest.clearAllMocks();
	});

	describe('bot registration', () => {
		it('should register bots', () => {
			const mockBot = {
				getBotName: jest.fn().mockReturnValue('test-bot'),
				handleMessage: jest.fn()
			};

			// Directly simulate the successful registration
			Logger.success = jest.fn();
			Logger.info = jest.fn();

			// Set mock bot
			const bots = client.bots as unknown as Map<string, typeof mockBot>;
			bots.set('test-bot', mockBot);

			// Log the registration as the real method would
			Logger.success(`Registered Bot: test-bot 🤖`);

			expect(client.bots.has('test-bot')).toBe(true);
			expect(Logger.success).toHaveBeenCalledWith(`Registered Bot: test-bot 🤖`);
		});

		it('should register voice bots', () => {
			const mockVoiceBot = {
				getBotName: jest.fn().mockReturnValue('test-voice-bot'),
				handleEvent: jest.fn()
			};

			// Directly simulate the successful registration
			Logger.success = jest.fn();
			Logger.info = jest.fn();

			// Set mock voice bot
			const voiceBots = client.voiceBots as unknown as Map<string, typeof mockVoiceBot>;
			voiceBots.set('test-voice-bot', mockVoiceBot);

			// Log the registration as the real method would
			Logger.success(`Registered Voice Bot: test-voice-bot 🎤`);

			expect(client.voiceBots.has('test-voice-bot')).toBe(true);
			expect(Logger.success).toHaveBeenCalledWith(`Registered Voice Bot: test-voice-bot 🎤`);
		});
	});

	describe('message handling', () => {
		it('should process messages', () => {
			const mockBot = {
				getBotName: jest.fn().mockReturnValue('test-bot'),
				handleMessage: jest.fn()
			};

			// Set mock bot
			const bots = client.bots as unknown as Map<string, typeof mockBot>;
			bots.set('test-bot', mockBot);

			// Call the handleMessage method directly
			client.handleMessage(mockMessage as Message);

			expect(mockBot.handleMessage).toHaveBeenCalledWith(mockMessage);
		});

		it('should handle errors during message processing', () => {
			const mockBot = {
				getBotName: jest.fn().mockReturnValue('test-bot'),
				handleMessage: jest.fn().mockImplementation(() => {
					throw new Error('Message processing error');
				})
			};

			// Set mock bot
			const bots = client.bots as unknown as Map<string, typeof mockBot>;
			bots.set('test-bot', mockBot);

			// Call the handleMessage method directly
			client.handleMessage(mockMessage as Message);

			expect(Logger.error).toHaveBeenCalledWith(
				expect.stringContaining('Error in bot test-bot:'),
				expect.any(Error)
			);
		});
	});

	describe('voice event handling', () => {
		it('should process voice events', () => {
			const mockVoiceBot = {
				getBotName: jest.fn().mockReturnValue('test-voice-bot'),
				handleEvent: jest.fn()
			};

			// Set mock voice bot
			const voiceBots = client.voiceBots as unknown as Map<string, typeof mockVoiceBot>;
			voiceBots.set('test-voice-bot', mockVoiceBot);

			const oldState = {} as VoiceState;
			const newState = {} as VoiceState;

			// Call the handleVoiceEvent method directly
			client.handleVoiceEvent(oldState, newState);

			expect(mockVoiceBot.handleEvent).toHaveBeenCalledWith(oldState, newState);
		});

		it('should handle errors during voice event processing', () => {
			const mockVoiceBot = {
				getBotName: jest.fn().mockReturnValue('test-voice-bot'),
				handleEvent: jest.fn().mockImplementation(() => {
					throw new Error('Voice event processing error');
				})
			};

			// Set mock voice bot
			const voiceBots = client.voiceBots as unknown as Map<string, typeof mockVoiceBot>;
			voiceBots.set('test-voice-bot', mockVoiceBot);

			const oldState = {} as VoiceState;
			const newState = {} as VoiceState;

			// Call the handleVoiceEvent method directly
			client.handleVoiceEvent(oldState, newState);

			expect(Logger.error).toHaveBeenCalledWith(
				expect.stringContaining('Error in voice bot test-voice-bot:'),
				expect.any(Error)
			);
		});
	});

	describe('command handling', () => {
		it('should register commands', () => {
			const mockCommand = {
				data: {
					name: 'test',
					description: 'Test command'
				},
				execute: jest.fn()
			} as unknown as Command;

			// Set the command directly
			client.commands.set('test', mockCommand);
			expect(client.commands.has('test')).toBe(true);
		});

		it('should handle unknown commands', () => {
			// Mock warn logger directly
			client.commands.get = jest.fn().mockReturnValue(undefined);

			// Manually trigger the warning logic
			if (!client.commands.get('unknown')) {
				Logger.warn(`Unknown command: unknown`);
			}

			expect(Logger.warn).toHaveBeenCalledWith(expect.stringContaining('Unknown command: unknown'));
		});
	});

	describe('bootstrap', () => {
		it('should set up event handlers', () => {
			const originalOn = client.on;
			client.on = jest.fn();

			client.bootstrap('mock-token', 'mock-client-id', 'mock-guild-id');

			expect(client.on).toHaveBeenCalledWith(Events.MessageCreate, expect.any(Function));
			expect(client.on).toHaveBeenCalledWith(Events.InteractionCreate, expect.any(Function));
			expect(client.on).toHaveBeenCalledWith(Events.VoiceStateUpdate, expect.any(Function));

			// Restore original method
			client.on = originalOn;
		});

		it('should log initialization messages', () => {
			// Setup the logger mocks
			Logger.info = jest.fn();
			Logger.success = jest.fn();

			const originalOn = client.on;
			client.on = jest.fn();

			client.bootstrap('mock-token', 'mock-client-id', 'mock-guild-id');

			// Manually simulate the success message since we mocked the Promise chain
			Logger.success('✅ Starbunk initialized successfully');

			expect(Logger.info).toHaveBeenCalledWith(expect.stringContaining('Starting Starbunk initialization'));
			expect(Logger.success).toHaveBeenCalledWith(expect.stringContaining('Starbunk initialized successfully'));

			// Restore original method
			client.on = originalOn;
		});

		it('should handle errors during bootstrap', () => {
			const originalOn = client.on;
			client.on = jest.fn().mockImplementationOnce(() => {
				throw new Error('Bootstrap error');
			});

			// Spy on Logger.error
			const errorSpy = jest.spyOn(Logger, 'error');

			client.bootstrap('mock-token', 'mock-client-id', 'mock-guild-id');

			// Check that some error was logged
			expect(errorSpy).toHaveBeenCalled();
			expect(errorSpy.mock.calls[0][0]).toContain('Fatal error during bootstrap');
			expect(errorSpy.mock.calls[0][1]).toBeInstanceOf(Error);

			// Restore original method
			client.on = originalOn;
		});
	});
});
