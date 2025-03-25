import { AutocompleteInteraction, ChatInputCommandInteraction, CommandInteractionOptionResolver, PermissionFlagsBits, PermissionsBitField, TextChannel } from 'discord.js';
import { BotRegistry } from '../../bots/botRegistry';
import botCommand from '../bot';

// Mock the BotRegistry
jest.mock('../../bots/botRegistry', () => {
	const mockRegistry = {
		enableBot: jest.fn(),
		disableBot: jest.fn(),
		getAllBotNames: jest.fn(),
		isBotEnabled: jest.fn(),
		getBotFrequency: jest.fn(),
		setBotFrequency: jest.fn()
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
				getString: jest.fn(),
				getInteger: jest.fn()
			} as unknown as CommandInteractionOptionResolver,
			memberPermissions: new PermissionsBitField([PermissionFlagsBits.Administrator]),
			client: {
				users: {
					fetch: jest.fn()
				}
			},
			user: {
				tag: 'testUser#1234',
				id: '123456789'
			},
			guild: {
				name: 'Test Server',
				id: '987654321'
			},
			channel: {
				name: 'test-channel',
				id: '456789123'
			} as unknown as TextChannel,
			valueOf: () => 'ChatInputCommandInteraction'
		} as unknown as jest.Mocked<ChatInputCommandInteraction>;

		// Mock autocomplete interaction
		mockAutocompleteInteraction = {
			respond: jest.fn(),
			options: {
				getFocused: jest.fn()
			} as unknown as CommandInteractionOptionResolver,
			valueOf: () => 'AutocompleteInteraction'
		} as unknown as jest.Mocked<AutocompleteInteraction>;

		// Setup default registry mock responses
		(registry.getAllBotNames as jest.Mock).mockReturnValue(['TestBot1', 'TestBot2']);
		(registry.isBotEnabled as jest.Mock).mockReturnValue(true);
		(registry.getBotFrequency as jest.Mock)
			.mockReturnValueOnce(50)  // TestBot1
			.mockReturnValueOnce(25); // TestBot2
	});

	describe('execute', () => {
		describe('permission handling', () => {
			it('should allow non-admin users to use report command', async () => {
				mockInteraction.memberPermissions = new PermissionsBitField([]);
				(mockInteraction.options.getSubcommand as jest.Mock).mockReturnValue('report');
				(mockInteraction.options.getString as jest.Mock)
					.mockReturnValueOnce('TestBot1') // bot_name
					.mockReturnValueOnce('Test report message'); // message

				const mockCova = { send: jest.fn().mockResolvedValue(undefined) };
				(mockInteraction.client.users.fetch as jest.Mock).mockResolvedValue(mockCova);

				await botCommand.execute(mockInteraction);

				expect(mockInteraction.reply).toHaveBeenCalledWith({
					content: expect.stringContaining('Report about `TestBot1` has been sent to Cova'),
					ephemeral: true
				});
			});

			it('should reject non-admin users for admin commands', async () => {
				mockInteraction.memberPermissions = new PermissionsBitField([]);
				const adminCommands = ['enable', 'disable', 'frequency', 'list-bots'];

				for (const command of adminCommands) {
					(mockInteraction.options.getSubcommand as jest.Mock).mockReturnValue(command);
					await botCommand.execute(mockInteraction);

					expect(mockInteraction.reply).toHaveBeenCalledWith({
						content: expect.stringContaining('need administrator permissions'),
						ephemeral: true
					});
				}
			});
		});

		describe('report subcommand', () => {
			beforeEach(() => {
				(mockInteraction.options.getSubcommand as jest.Mock).mockReturnValue('report');
			});

			it('should send report to Cova successfully', async () => {
				const mockCova = { send: jest.fn().mockResolvedValue(undefined) };
				(mockInteraction.client.users.fetch as jest.Mock).mockResolvedValue(mockCova);
				(mockInteraction.options.getString as jest.Mock)
					.mockReturnValueOnce('TestBot1') // bot_name
					.mockReturnValueOnce('Test report message'); // message

				await botCommand.execute(mockInteraction);

				expect(mockCova.send).toHaveBeenCalledWith(expect.stringContaining('Bot Report'));
				expect(mockCova.send).toHaveBeenCalledWith(expect.stringContaining('TestBot1'));
				expect(mockCova.send).toHaveBeenCalledWith(expect.stringContaining('Test report message'));
				expect(mockInteraction.reply).toHaveBeenCalledWith({
					content: expect.stringContaining('Report about `TestBot1` has been sent to Cova'),
					ephemeral: true
				});
			});

			it('should handle case when Cova cannot be found', async () => {
				(mockInteraction.client.users.fetch as jest.Mock).mockResolvedValue(null);
				(mockInteraction.options.getString as jest.Mock)
					.mockReturnValueOnce('TestBot1')
					.mockReturnValueOnce('Test report message');

				await botCommand.execute(mockInteraction);

				expect(mockInteraction.reply).toHaveBeenCalledWith({
					content: expect.stringContaining('Could not find Cova'),
					ephemeral: true
				});
			});

			it('should handle DM send failure', async () => {
				const mockCova = { send: jest.fn().mockRejectedValue(new Error('Failed to send DM')) };
				(mockInteraction.client.users.fetch as jest.Mock).mockResolvedValue(mockCova);
				(mockInteraction.options.getString as jest.Mock)
					.mockReturnValueOnce('TestBot1')
					.mockReturnValueOnce('Test report message');

				await botCommand.execute(mockInteraction);

				expect(mockInteraction.reply).toHaveBeenCalledWith({
					content: expect.stringContaining('Failed to send DM to Cova'),
					ephemeral: true
				});
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
					content: expect.stringMatching(/TestBot1.*✅.*\(50%\)/) && expect.stringMatching(/TestBot2.*❌.*\(25%\)/),
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
				(mockInteraction.options.getSubcommand as jest.Mock).mockReturnValue('unknown');
			});

			it('should show admin help text for administrators', async () => {
				mockInteraction.memberPermissions = new PermissionsBitField([PermissionFlagsBits.Administrator]);
				await botCommand.execute(mockInteraction);

				expect(mockInteraction.reply).toHaveBeenCalledWith({
					content: expect.stringContaining('Bot Manager Commands') &&
						expect.stringContaining('/bot enable') &&
						expect.stringContaining('/bot disable') &&
						expect.stringContaining('/bot frequency') &&
						expect.stringContaining('/bot list-bots') &&
						expect.stringContaining('/bot report'),
					ephemeral: true
				});
			});

			it('should show limited help text for non-administrators', async () => {
				mockInteraction.memberPermissions = new PermissionsBitField([]);
				await botCommand.execute(mockInteraction);

				expect(mockInteraction.reply).toHaveBeenCalledWith({
					content: expect.stringContaining('Bot Commands') &&
						expect.stringContaining('/bot report') &&
						expect.not.stringContaining('/bot enable') &&
						expect.not.stringContaining('/bot disable') &&
						expect.not.stringContaining('/bot frequency') &&
						expect.not.stringContaining('/bot list-bots'),
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
