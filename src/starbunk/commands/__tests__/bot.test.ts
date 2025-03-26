import { AutocompleteInteraction, ChatInputCommandInteraction, CommandInteractionOptionResolver, PermissionFlagsBits, PermissionsBitField } from 'discord.js';
import { BotRegistry } from '../../bots/botRegistry';
import { BaseVoiceBot } from '../../bots/core/voice-bot-adapter';
import botCommand from '../bot';

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
		(registry.isBotEnabled as jest.Mock).mockReturnValue(true);
		(registry.getBotFrequency as jest.Mock)
			.mockReturnValueOnce(50)  // TestBot1
			.mockReturnValueOnce(25); // TestBot2
		(registry.getBotDescription as jest.Mock)
			.mockReturnValueOnce('Test bot 1 description')  // TestBot1
			.mockReturnValueOnce('Test bot 2 description'); // TestBot2
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
				(mockBotRegistry.enableBot as jest.Mock).mockReturnValue(true);

				await botCommand.execute(mockInteraction);

				expect(mockBotRegistry.enableBot).toHaveBeenCalledWith('TestBot1');
				expect(mockInteraction.reply).toHaveBeenCalledWith({
					content: 'Bot TestBot1 has been enabled.',
					ephemeral: true
				});
			});

			it('should handle non-existent bot', async () => {
				(mockInteraction.options as any).getString.mockReturnValue('NonExistentBot');
				(mockBotRegistry.enableBot as jest.Mock).mockReturnValue(false);

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

			it('should disable an existing bot and notify Cova', async () => {
				(mockInteraction.options as any).getString.mockReturnValue('TestBot1');
				(mockBotRegistry.disableBot as jest.Mock).mockReturnValue(true);

				// Mock Cova user for notification
				const mockCova = { send: jest.fn().mockResolvedValue(undefined) };
				(mockInteraction.client.users.fetch as jest.Mock).mockResolvedValue(mockCova);

				await botCommand.execute(mockInteraction);

				expect(mockBotRegistry.disableBot).toHaveBeenCalledWith('TestBot1');
				expect(mockCova.send).toHaveBeenCalledWith(expect.stringContaining('Bot Disabled Notification'));
				expect(mockCova.send).toHaveBeenCalledWith(expect.stringContaining('TestBot1'));
				expect(mockInteraction.reply).toHaveBeenCalledWith({
					content: 'Bot TestBot1 has been disabled.',
					ephemeral: true
				});
			});

			it('should handle non-existent bot', async () => {
				(mockInteraction.options as any).getString.mockReturnValue('NonExistentBot');
				(mockBotRegistry.disableBot as jest.Mock).mockReturnValue(false);

				await botCommand.execute(mockInteraction);

				expect(mockInteraction.reply).toHaveBeenCalledWith({
					content: expect.stringContaining('not found'),
					ephemeral: true
				});
			});

			it('should still disable the bot when notification to Cova fails', async () => {
				(mockInteraction.options as any).getString.mockReturnValue('TestBot1');
				(mockBotRegistry.disableBot as jest.Mock).mockReturnValue(true);

				// Mock Cova user with failed send
				const mockCova = { send: jest.fn().mockRejectedValue(new Error('Failed to send DM')) };
				(mockInteraction.client.users.fetch as jest.Mock).mockResolvedValue(mockCova);

				await botCommand.execute(mockInteraction);

				expect(mockBotRegistry.disableBot).toHaveBeenCalledWith('TestBot1');
				expect(mockCova.send).toHaveBeenCalled();
				expect(mockInteraction.reply).toHaveBeenCalledWith({
					content: 'Bot TestBot1 has been disabled.',
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
				mockBotRegistry.isBotEnabled.mockImplementation((name) => name === 'ReplyBot1');
				mockBotRegistry.getBotFrequency.mockReturnValue(50);

				await botCommand.execute(mockInteraction);

				expect(mockInteraction.reply).toHaveBeenCalledWith({
					content: expect.stringContaining('**Reply Bots:**') &&
						expect.stringContaining('ReplyBot1: ✅') &&
						expect.stringContaining('ReplyBot2: ❌') &&
						expect.stringContaining('**Voice Bots:**') &&
						expect.stringContaining('VoiceBot1') &&
						expect.stringContaining('VoiceBot2'),
					ephemeral: true
				});
			});

			it('should handle no registered bots', async () => {
				mockBotRegistry.getReplyBotNames.mockReturnValue([]);
				mockBotRegistry.getVoiceBotNames.mockReturnValue([]);

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
			expect(mockInteraction.reply).toHaveBeenCalledWith({
				content: 'Set TestBot\'s response rate to 50%',
				ephemeral: true
			});
		});

		it('should set voice bot volume', async () => {
			const mockVoiceBot = {
				setVolume: jest.fn(),
			} as unknown as BaseVoiceBot;

			(mockInteraction.options.getSubcommand as jest.Mock).mockReturnValue('volume');
			(mockInteraction.options.getString as jest.Mock).mockReturnValue('VoiceBot1');
			(mockInteraction.options.getInteger as jest.Mock).mockReturnValue(75);
			mockBotRegistry.getVoiceBot.mockReturnValue(mockVoiceBot);

			await botCommand.execute(mockInteraction);

			expect(mockBotRegistry.getVoiceBot).toHaveBeenCalledWith('VoiceBot1');
			expect(mockVoiceBot.setVolume).toHaveBeenCalledWith(0.75);
			expect(mockInteraction.reply).toHaveBeenCalledWith({
				content: 'Set VoiceBot1\'s volume to 75%',
				ephemeral: true
			});
		});

		it('should handle non-existent voice bot for volume command', async () => {
			(mockInteraction.options.getSubcommand as jest.Mock).mockReturnValue('volume');
			(mockInteraction.options.getString as jest.Mock).mockReturnValue('NonExistentBot');
			(mockInteraction.options.getInteger as jest.Mock).mockReturnValue(75);
			mockBotRegistry.getVoiceBot.mockReturnValue(undefined);

			await botCommand.execute(mockInteraction);

			expect(mockBotRegistry.getVoiceBot).toHaveBeenCalledWith('NonExistentBot');
			expect(mockInteraction.reply).toHaveBeenCalledWith({
				content: 'Bot NonExistentBot is not a voice bot or does not exist',
				ephemeral: true
			});
		});

		it('should list all bots with their status', async () => {
			(mockInteraction.options.getSubcommand as jest.Mock).mockReturnValue('list-bots');
			mockBotRegistry.isBotEnabled.mockReturnValue(true);
			mockBotRegistry.getBotFrequency.mockReturnValue(75);
			mockBotRegistry.getVoiceBot.mockImplementation((_name) => ({
				getVolume: jest.fn().mockReturnValue(0.5),
			} as unknown as BaseVoiceBot));

			await botCommand.execute(mockInteraction);

			expect(mockInteraction.reply).toHaveBeenCalledWith({
				content: expect.stringContaining('**Reply Bots:**'),
				ephemeral: true
			});
			expect(mockInteraction.reply).toHaveBeenCalledWith({
				content: expect.stringContaining('**Voice Bots:**'),
				ephemeral: true
			});
		});
	});

	describe('autocomplete', () => {
		it('should filter bot names based on input', async () => {
			(mockAutocompleteInteraction.options.getFocused as jest.Mock).mockReturnValue('Reply');
			(mockAutocompleteInteraction.options.getSubcommand as jest.Mock).mockReturnValue('enable');

			await botCommand.autocomplete(mockAutocompleteInteraction);

			expect(mockAutocompleteInteraction.respond).toHaveBeenCalledWith([
				{ name: 'ReplyBot1', value: 'ReplyBot1' },
				{ name: 'ReplyBot2', value: 'ReplyBot2' }
			]);
		});

		it('should handle empty input', async () => {
			(mockAutocompleteInteraction.options.getFocused as jest.Mock).mockReturnValue('');
			(mockAutocompleteInteraction.options.getSubcommand as jest.Mock).mockReturnValue('enable');

			await botCommand.autocomplete(mockAutocompleteInteraction);

			expect(mockAutocompleteInteraction.respond).toHaveBeenCalledWith([
				{ name: 'ReplyBot1', value: 'ReplyBot1' },
				{ name: 'ReplyBot2', value: 'ReplyBot2' },
				{ name: 'VoiceBot1', value: 'VoiceBot1' },
				{ name: 'VoiceBot2', value: 'VoiceBot2' }
			]);
		});

		it('should return voice bot names for volume command', async () => {
			(mockAutocompleteInteraction.options.getSubcommand as jest.Mock).mockReturnValue('volume');
			(mockAutocompleteInteraction.options.getFocused as jest.Mock).mockReturnValue('voice');

			await botCommand.autocomplete(mockAutocompleteInteraction);

			expect(mockBotRegistry.getVoiceBotNames).toHaveBeenCalled();
			expect(mockAutocompleteInteraction.respond).toHaveBeenCalledWith([
				{ name: 'VoiceBot1', value: 'VoiceBot1' },
				{ name: 'VoiceBot2', value: 'VoiceBot2' }
			]);
		});

		it('should return reply bot names for frequency command', async () => {
			(mockAutocompleteInteraction.options.getSubcommand as jest.Mock).mockReturnValue('frequency');
			(mockAutocompleteInteraction.options.getFocused as jest.Mock).mockReturnValue('reply');

			await botCommand.autocomplete(mockAutocompleteInteraction);

			expect(mockBotRegistry.getReplyBotNames).toHaveBeenCalled();
			expect(mockAutocompleteInteraction.respond).toHaveBeenCalledWith([
				{ name: 'ReplyBot1', value: 'ReplyBot1' },
				{ name: 'ReplyBot2', value: 'ReplyBot2' }
			]);
		});

		it('should return all bot names for enable/disable commands', async () => {
			(mockAutocompleteInteraction.options.getSubcommand as jest.Mock).mockReturnValue('enable');
			(mockAutocompleteInteraction.options.getFocused as jest.Mock).mockReturnValue('bot');

			await botCommand.autocomplete(mockAutocompleteInteraction);

			expect(mockBotRegistry.getReplyBotNames).toHaveBeenCalled();
			expect(mockBotRegistry.getVoiceBotNames).toHaveBeenCalled();
			expect(mockAutocompleteInteraction.respond).toHaveBeenCalledWith([
				{ name: 'ReplyBot1', value: 'ReplyBot1' },
				{ name: 'ReplyBot2', value: 'ReplyBot2' },
				{ name: 'VoiceBot1', value: 'VoiceBot1' },
				{ name: 'VoiceBot2', value: 'VoiceBot2' }
			]);
		});

		it('should handle errors in autocomplete', async () => {
			(mockAutocompleteInteraction.options.getSubcommand as jest.Mock).mockReturnValue('enable');
			(mockAutocompleteInteraction.options.getFocused as jest.Mock).mockReturnValue('bot');
			mockBotRegistry.getReplyBotNames.mockImplementation(() => {
				throw new Error('Test error');
			});

			await botCommand.autocomplete(mockAutocompleteInteraction);

			expect(mockAutocompleteInteraction.respond).toHaveBeenCalledWith([]);
		});
	});
});
