import { AutocompleteInteraction, ChatInputCommandInteraction, CommandInteractionOptionResolver, PermissionFlagsBits, PermissionsBitField } from 'discord.js';
import { BotRegistry } from '../../bots/botRegistry';
import { BaseVoiceBot } from '../../bots/core/voice-bot-adapter';
import botCommand from '../botCommandHandler';

// Mock the BotRegistry
jest.mock('../../bots/botRegistry', () => {
	const mockRegistry = {
		enableBot: jest.fn(),
		disableBot: jest.fn(),
		getAllBotNames: jest.fn(),
		isBotEnabled: jest.fn(),
		getBotFrequency: jest.fn(),
		setBotFrequency: jest.fn(),
		getBotDescription: jest.fn(),
		getReplyBotNames: jest.fn().mockReturnValue(['ReplyBot1', 'ReplyBot2']),
		getVoiceBotNames: jest.fn().mockReturnValue(['VoiceBot1', 'VoiceBot2']),
		getVoiceBot: jest.fn().mockImplementation((_name) => ({
			getVolume: jest.fn().mockReturnValue(0.5),
			setVolume: jest.fn(),
		} as unknown as BaseVoiceBot)),
	};
	return {
		BotRegistry: {
			getInstance: jest.fn().mockReturnValue(mockRegistry)
		}
	};
});

// Mock logger
jest.mock('../../../services/logger');

describe('Bot Command', () => {
	let mockInteraction: jest.Mocked<ChatInputCommandInteraction>;
	let mockAutocompleteInteraction: jest.Mocked<AutocompleteInteraction>;
	let mockBotRegistry: jest.Mocked<BotRegistry>;
	const registry = BotRegistry.getInstance();

	beforeEach(() => {
		// Reset all mocks
		jest.clearAllMocks();

		// Mock BotRegistry instance
		mockBotRegistry = {
			enableBot: jest.fn().mockReturnValue(true),
			disableBot: jest.fn().mockReturnValue(true),
			getAllBotNames: jest.fn().mockReturnValue(['TestBot1', 'TestBot2']),
			isBotEnabled: jest.fn().mockReturnValue(true),
			getBotFrequency: jest.fn().mockReturnValue(50),
			setBotFrequency: jest.fn(),
			getBotDescription: jest.fn().mockReturnValue('Test bot description'),
			getReplyBotNames: jest.fn().mockReturnValue(['ReplyBot1', 'ReplyBot2']),
			getVoiceBotNames: jest.fn().mockReturnValue(['VoiceBot1', 'VoiceBot2']),
			getVoiceBot: jest.fn().mockImplementation((_name) => ({
				getVolume: jest.fn().mockReturnValue(0.5),
				setVolume: jest.fn(),
			} as unknown as BaseVoiceBot)),
		} as unknown as jest.Mocked<BotRegistry>;

		(BotRegistry.getInstance as jest.Mock).mockReturnValue(mockBotRegistry);

		// Mock interaction
		mockInteraction = {
			options: {
				getSubcommand: jest.fn(),
				getString: jest.fn(),
				getInteger: jest.fn(),
			} as unknown as jest.Mocked<CommandInteractionOptionResolver>,
			reply: jest.fn(),
			memberPermissions: new PermissionsBitField([PermissionFlagsBits.Administrator]),
			client: {
				users: {
					fetch: jest.fn(),
				},
			},
			user: {
				tag: 'TestUser#1234',
				id: '123456789',
			},
			guild: {
				name: 'Test Guild',
				id: '987654321',
			},
			channel: {
				name: 'test-channel',
				id: '456789123',
			},
		} as unknown as jest.Mocked<ChatInputCommandInteraction>;

		// Mock autocomplete interaction
		mockAutocompleteInteraction = {
			options: {
				getFocused: jest.fn(),
				getSubcommand: jest.fn(),
			} as unknown as jest.Mocked<CommandInteractionOptionResolver>,
			respond: jest.fn(),
		} as unknown as jest.Mocked<AutocompleteInteraction>;

		// Setup default registry mock responses
		(registry.getAllBotNames as jest.Mock).mockReturnValue(['TestBot1', 'TestBot2']);
	});

	describe('execute', () => {
		// Test core permission functionality
		it('should allow non-admin users to use report command', async () => {
			mockInteraction.memberPermissions = new PermissionsBitField([]);
			(mockInteraction.options.getSubcommand as jest.Mock).mockReturnValue('report');
			(mockInteraction.options.getString as jest.Mock)
				.mockReturnValueOnce('TestBot1')
				.mockReturnValueOnce('Test report message');

			const mockCova = { send: jest.fn().mockResolvedValue(undefined) };
			(mockInteraction.client.users.fetch as jest.Mock).mockResolvedValue(mockCova);

			await botCommand.execute(mockInteraction);

			expect(mockInteraction.reply).toHaveBeenCalledWith({
				content: 'Your report has been sent to Cova.',
				ephemeral: true
			});
		});

		it('should reject non-admin users for admin commands', async () => {
			mockInteraction.memberPermissions = new PermissionsBitField([]);
			(mockInteraction.options.getSubcommand as jest.Mock).mockReturnValue('enable');

			await botCommand.execute(mockInteraction);

			expect(mockInteraction.reply).toHaveBeenCalledWith({
				content: expect.stringContaining('need administrator permissions'),
				ephemeral: true
			});
		});

		// Test basic command functionality
		it('should enable a bot', async () => {
			(mockInteraction.options.getSubcommand as jest.Mock).mockReturnValue('enable');
			(mockInteraction.options.getString as jest.Mock).mockReturnValue('TestBot');

			await botCommand.execute(mockInteraction);

			expect(mockBotRegistry.enableBot).toHaveBeenCalledWith('TestBot');
			expect(mockInteraction.reply).toHaveBeenCalledWith({
				content: 'Bot TestBot has been enabled.',
				ephemeral: true
			});
		});

		it('should disable a bot', async () => {
			(mockInteraction.options.getSubcommand as jest.Mock).mockReturnValue('disable');
			(mockInteraction.options.getString as jest.Mock).mockReturnValue('TestBot');

			await botCommand.execute(mockInteraction);

			expect(mockBotRegistry.disableBot).toHaveBeenCalledWith('TestBot');
			expect(mockInteraction.reply).toHaveBeenCalledWith({
				content: 'Bot TestBot has been disabled.',
				ephemeral: true
			});
		});

		it('should set reply bot frequency', async () => {
			(mockInteraction.options.getSubcommand as jest.Mock).mockReturnValue('frequency');
			(mockInteraction.options.getString as jest.Mock).mockReturnValue('TestBot');
			(mockInteraction.options.getInteger as jest.Mock).mockReturnValue(50);

			await botCommand.execute(mockInteraction);

			expect(mockBotRegistry.setBotFrequency).toHaveBeenCalledWith('TestBot', 50);
		});

		it('should list bots when requested', async () => {
			(mockInteraction.options.getSubcommand as jest.Mock).mockReturnValue('list-bots');

			await botCommand.execute(mockInteraction);

			expect(mockInteraction.reply).toHaveBeenCalled();
			expect(mockBotRegistry.getReplyBotNames).toHaveBeenCalled();
			expect(mockBotRegistry.getVoiceBotNames).toHaveBeenCalled();
		});
	});

	// Basic autocomplete tests
	describe('autocomplete', () => {
		it('should return filtered bot names based on user input', async () => {
			(mockAutocompleteInteraction.options.getFocused as jest.Mock).mockReturnValue('Reply');
			(mockAutocompleteInteraction.options.getSubcommand as jest.Mock).mockReturnValue('enable');

			await botCommand.autocomplete(mockAutocompleteInteraction);

			expect(mockAutocompleteInteraction.respond).toHaveBeenCalledWith([
				{ name: 'ReplyBot1', value: 'ReplyBot1' },
				{ name: 'ReplyBot2', value: 'ReplyBot2' }
			]);
		});

		it('should return appropriate bot names based on command context', async () => {
			(mockAutocompleteInteraction.options.getFocused as jest.Mock).mockReturnValue('');
			(mockAutocompleteInteraction.options.getSubcommand as jest.Mock).mockReturnValue('volume');

			await botCommand.autocomplete(mockAutocompleteInteraction);

			expect(mockBotRegistry.getVoiceBotNames).toHaveBeenCalled();
		});
	});
});
