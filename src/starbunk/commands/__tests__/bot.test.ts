import { AutocompleteInteraction, ChatInputCommandInteraction, CommandInteractionOptionResolver, PermissionFlagsBits, PermissionsBitField } from 'discord.js';
import { BotRegistry } from '../../bots/botRegistry';
import botCommand from '../bot';

// Mock the BotRegistry
jest.mock('../../bots/botRegistry', () => {
	const mockRegistry = {
		enableBot: jest.fn(),
		disableBot: jest.fn(),
		getAllBotNames: jest.fn(),
		isBotEnabled: jest.fn()
	};
	return {
		BotRegistry: {
			getInstance: () => mockRegistry
		}
	};
});

describe('Bot Command', () => {
	let mockInteraction: jest.Mocked<ChatInputCommandInteraction>;
	let mockAutocompleteInteraction: jest.Mocked<AutocompleteInteraction>;
	const registry = BotRegistry.getInstance();

	beforeEach(() => {
		// Reset all mocks
		jest.clearAllMocks();

		// Mock interaction
		mockInteraction = {
			reply: jest.fn(),
			options: {
				getSubcommand: jest.fn(),
				getString: jest.fn()
			} as unknown as CommandInteractionOptionResolver,
			memberPermissions: new PermissionsBitField([PermissionFlagsBits.Administrator]),
			valueOf: () => 'ChatInputCommandInteraction'
		} as unknown as jest.Mocked<ChatInputCommandInteraction>;

		// Mock autocomplete interaction
		mockAutocompleteInteraction = {
			respond: jest.fn(),
			options: {
				getFocused: jest.fn(),
				get: jest.fn(),
				getString: jest.fn(),
				getNumber: jest.fn(),
				getInteger: jest.fn(),
				getBoolean: jest.fn(),
				getSubcommand: jest.fn(),
				getSubcommandGroup: jest.fn()
			} as unknown as CommandInteractionOptionResolver,
			valueOf: () => 'AutocompleteInteraction'
		} as unknown as jest.Mocked<AutocompleteInteraction>;

		// Setup default registry mock responses
		(registry.getAllBotNames as jest.Mock).mockReturnValue(['TestBot1', 'TestBot2']);
		(registry.isBotEnabled as jest.Mock).mockReturnValue(true);
	});

	describe('execute', () => {
		it('should reject non-admin users', async () => {
			mockInteraction.memberPermissions = new PermissionsBitField([]);

			await botCommand.execute(mockInteraction);

			expect(mockInteraction.reply).toHaveBeenCalledWith({
				content: expect.stringContaining('need administrator permissions'),
				ephemeral: true
			});
		});

		describe('enable subcommand', () => {
			beforeEach(() => {
				mockInteraction.memberPermissions = new PermissionsBitField([PermissionFlagsBits.Administrator]);
				(mockInteraction.options as any).getSubcommand.mockReturnValue('enable');
			});

			it('should enable an existing bot', async () => {
				(mockInteraction.options as any).getString.mockReturnValue('TestBot1');
				(registry.enableBot as jest.Mock).mockReturnValue(true);

				await botCommand.execute(mockInteraction);

				expect(registry.enableBot).toHaveBeenCalledWith('TestBot1');
				expect(mockInteraction.reply).toHaveBeenCalledWith({
					content: expect.stringContaining('has been enabled'),
					ephemeral: true
				});
			});

			it('should handle non-existent bot', async () => {
				(mockInteraction.options as any).getString.mockReturnValue('NonExistentBot');
				(registry.enableBot as jest.Mock).mockReturnValue(false);

				await botCommand.execute(mockInteraction);

				expect(mockInteraction.reply).toHaveBeenCalledWith({
					content: expect.stringContaining('not found'),
					ephemeral: true
				});
			});
		});

		describe('disable subcommand', () => {
			beforeEach(() => {
				mockInteraction.memberPermissions = new PermissionsBitField([PermissionFlagsBits.Administrator]);
				(mockInteraction.options as any).getSubcommand.mockReturnValue('disable');
			});

			it('should disable an existing bot', async () => {
				(mockInteraction.options as any).getString.mockReturnValue('TestBot1');
				(registry.disableBot as jest.Mock).mockReturnValue(true);

				await botCommand.execute(mockInteraction);

				expect(registry.disableBot).toHaveBeenCalledWith('TestBot1');
				expect(mockInteraction.reply).toHaveBeenCalledWith({
					content: expect.stringContaining('has been disabled'),
					ephemeral: true
				});
			});

			it('should handle non-existent bot', async () => {
				(mockInteraction.options as any).getString.mockReturnValue('NonExistentBot');
				(registry.disableBot as jest.Mock).mockReturnValue(false);

				await botCommand.execute(mockInteraction);

				expect(mockInteraction.reply).toHaveBeenCalledWith({
					content: expect.stringContaining('not found'),
					ephemeral: true
				});
			});
		});

		describe('list-bots subcommand', () => {
			beforeEach(() => {
				mockInteraction.memberPermissions = new PermissionsBitField([PermissionFlagsBits.Administrator]);
				(mockInteraction.options as any).getSubcommand.mockReturnValue('list-bots');
			});

			it('should list all bots and their status', async () => {
				(registry.isBotEnabled as jest.Mock)
					.mockReturnValueOnce(true)  // TestBot1
					.mockReturnValueOnce(false); // TestBot2

				await botCommand.execute(mockInteraction);

				expect(mockInteraction.reply).toHaveBeenCalledWith({
					content: expect.stringContaining('TestBot1') && expect.stringContaining('TestBot2'),
					ephemeral: true
				});
			});

			it('should handle no registered bots', async () => {
				(registry.getAllBotNames as jest.Mock).mockReturnValue([]);

				await botCommand.execute(mockInteraction);

				expect(mockInteraction.reply).toHaveBeenCalledWith({
					content: expect.stringContaining('No bots registered'),
					ephemeral: true
				});
			});
		});

		describe('default/help', () => {
			beforeEach(() => {
				mockInteraction.memberPermissions = new PermissionsBitField([PermissionFlagsBits.Administrator]);
				(mockInteraction.options as any).getSubcommand.mockReturnValue('unknown');
			});

			it('should show help text for unknown subcommand', async () => {
				await botCommand.execute(mockInteraction);

				expect(mockInteraction.reply).toHaveBeenCalledWith({
					content: expect.stringContaining('Bot Manager Commands'),
					ephemeral: true
				});
			});
		});
	});

	describe('autocomplete', () => {
		it('should filter bot names based on input', async () => {
			(mockAutocompleteInteraction.options as any).getFocused.mockReturnValue('test');

			await botCommand.autocomplete(mockAutocompleteInteraction);

			expect(mockAutocompleteInteraction.respond).toHaveBeenCalledWith([
				{ name: 'TestBot1', value: 'TestBot1' },
				{ name: 'TestBot2', value: 'TestBot2' }
			]);
		});

		it('should handle no matches', async () => {
			(mockAutocompleteInteraction.options as any).getFocused.mockReturnValue('xyz');

			await botCommand.autocomplete(mockAutocompleteInteraction);

			expect(mockAutocompleteInteraction.respond).toHaveBeenCalledWith([]);
		});

		it('should handle empty input', async () => {
			(mockAutocompleteInteraction.options as any).getFocused.mockReturnValue('');

			await botCommand.autocomplete(mockAutocompleteInteraction);

			expect(mockAutocompleteInteraction.respond).toHaveBeenCalledWith([
				{ name: 'TestBot1', value: 'TestBot1' },
				{ name: 'TestBot2', value: 'TestBot2' }
			]);
		});
	});
});
