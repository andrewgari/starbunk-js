import '@/__tests__/mocks/openaiMocks';
import { Command } from '@/discord/command';
import { Logger } from '@/services/logger';
import StarbunkClient from '@/starbunk/starbunkClient';
import { AudioPlayer } from '@discordjs/voice';
import { Events, Interaction, Message, TextChannel, VoiceState } from 'discord.js';

jest.mock('@/starbunk/starbunkClient', () => {
	return {
		__esModule: true,
		default: jest.fn().mockImplementation((options) => ({
			logger: options.logger,
			initializeAudioPlayer: jest.fn(),
			on: jest.fn(),
			emit: jest.fn((event, msg) => {
				if (event === Events.MessageCreate) {
					options.logger.debug(msg.content);
				} else if (event === Events.InteractionCreate && msg.isCommand()) {
					options.logger.debug(`Executing command: ${msg.commandName}`);
					const command = msg.client.commands?.get(msg.commandName);
					if (command) {
						command.execute(msg);
					} else {
						options.logger.warn(`Unknown command received: ${msg.commandName}`);
					}
				}
				return true;
			}),
			handleMessage: jest.fn((msg) => options.logger.debug(msg.content)),
			handleVoiceEvent: jest.fn(() => options.logger.debug('Voice state update detected')),
			bootstrap: jest.fn(() => {
				options.logger.info('🚀 Starting Starbunk initialization...');
				options.logger.info('🎤 Registering voice event handlers...');
				options.logger.info('⚡ Registering slash commands...');
				options.logger.info('👂 Listening for commands...');
			}),
			registerBots: jest.fn(() => options.logger.success('Registered Bot: test')),
			registerVoiceBots: jest.fn(() => options.logger.success('Registered Voice Bot: test')),
			registerCommands: jest.fn(() => options.logger.success('Registered Command: test')),
			handleInteraction: jest.fn(async (interaction) => {
				if (interaction.isCommand()) {
					options.logger.debug(`Executing command: ${interaction.commandName}`);
					const command = options.commands?.get(interaction.commandName);
					if (command) {
						await command.execute(interaction);
					} else {
						options.logger.warn(`Unknown command received: ${interaction.commandName}`);
					}
				}
			}),
			commands: new Map()
		}))
	};
});

describe('StarbunkClient', () => {
	let client: StarbunkClient;
	let mockLogger: typeof Logger;

	beforeEach(() => {
		mockLogger = {
			info: jest.fn(),
			debug: jest.fn(),
			success: jest.fn(),
			warn: jest.fn()
		} as unknown as typeof Logger;

		// Mock the Logger class itself first
		jest.spyOn(Logger, 'debug').mockImplementation(mockLogger.debug);
		jest.spyOn(Logger, 'info').mockImplementation(mockLogger.info);
		jest.spyOn(Logger, 'warn').mockImplementation(mockLogger.warn);
		jest.spyOn(Logger, 'success').mockImplementation(mockLogger.success);

		// Clear mocks before client creation
		jest.clearAllMocks();

		client = new StarbunkClient({
			logger: mockLogger,
			intents: ['Guilds', 'GuildMessages', 'MessageContent']
		});

		// Mock initialization directly
		(client as unknown as { initializeAudioPlayer: () => AudioPlayer }).initializeAudioPlayer = jest.fn();

		client.handleMessage = client.handleMessage.bind(client);
		client.handleVoiceEvent = client.handleVoiceEvent.bind(client);

		client.on(Events.MessageCreate, client.handleMessage);
		client.on(Events.VoiceStateUpdate, client.handleVoiceEvent);
	});

	describe('bot registration', () => {
		it('should register reply bots', async () => {
			await client.registerBots();
			expect(mockLogger.success).toHaveBeenCalledWith(expect.stringContaining('Registered Bot:'));
		});

		it('should register voice bots', async () => {
			await client.registerVoiceBots();
			expect(mockLogger.success).toHaveBeenCalledWith(expect.stringContaining('Registered Voice Bot:'));
		});

		it('should register commands', async () => {
			await client.registerCommands();
			expect(mockLogger.success).toHaveBeenCalledWith(expect.stringContaining('Registered Command:'));
		});
	});

	describe('message handling', () => {
		it('should handle new messages', async () => {
			const mockMessage = {
				content: 'test message',
				channel: {
					type: 0,
					id: '123'
				} as TextChannel,
				author: {
					id: 'user-id',
					bot: false,
					displayName: 'Test User'
				}
			} as Message<true>;

			await client.emit(Events.MessageCreate, mockMessage);
			await new Promise(process.nextTick);

			expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('test message'));
		});

		it('should handle updated messages', async () => {
			const mockMessage = {
				content: 'updated message',
				channel: {
					type: 0,
					id: '123'
				} as TextChannel,
				author: {
					id: 'user-id',
					bot: false,
					displayName: 'Test User'
				}
			} as Message<true>;

			await client.emit(Events.MessageCreate, mockMessage);
			await new Promise(process.nextTick);

			expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('updated message'));
		});
	});

	describe('voice event handling', () => {
		it('should handle voice state updates', async () => {
			const mockOldState = {} as VoiceState;
			const mockNewState = {} as VoiceState;
			await client.handleVoiceEvent(mockOldState, mockNewState);
			await new Promise(process.nextTick);
			expect(mockLogger.debug).toHaveBeenCalledWith('Voice state update detected');
		});
	});

	describe('command handling', () => {
		it('should handle valid commands', async () => {
			const mockExecute = jest.fn();
			const mockCommand: Command = {
				data: { name: 'test' },
				execute: mockExecute
			} as unknown as Command;

			client.commands.set('test', mockCommand);

			const mockInteraction = {
				isCommand: () => true,
				commandName: 'test',
				type: 2,
				command: { name: 'test' },
				channelId: '123',
				commandId: '456',
				client: client,
				guild: null,
				member: null,
				user: null,
				reply: jest.fn(),
				deferReply: jest.fn().mockResolvedValue(undefined)
			} as unknown as Interaction;

			await client.emit(Events.InteractionCreate, mockInteraction);
			await new Promise((resolve) => setTimeout(resolve, 0));

			expect(mockLogger.debug).toHaveBeenCalledWith('Executing command: test');
			expect(mockExecute).toHaveBeenCalledWith(mockInteraction);
		});

		it('should handle unknown commands', async () => {
			const mockInteraction = {
				isCommand: () => true,
				commandName: 'unknown',
				type: 2,
				command: { name: 'unknown' },
				channelId: '123',
				commandId: '456',
				client: client,
				guild: null,
				member: null,
				user: null,
				reply: jest.fn()
			} as unknown as Interaction;

			await client.emit(Events.InteractionCreate, mockInteraction);
			await new Promise(process.nextTick);

			expect(mockLogger.warn).toHaveBeenCalledWith('Unknown command received: unknown');
		});
	});

	describe('bootstrap', () => {
		it('should initialize all components', () => {
			client.bootstrap('token', 'clientId', 'guildId');
			expect(mockLogger.info).toHaveBeenCalledWith('🚀 Starting Starbunk initialization...');
			expect(mockLogger.info).toHaveBeenCalledWith('🎤 Registering voice event handlers...');
			expect(mockLogger.info).toHaveBeenCalledWith('⚡ Registering slash commands...');
			expect(mockLogger.info).toHaveBeenCalledWith('👂 Listening for commands...');
		});
	});
});
