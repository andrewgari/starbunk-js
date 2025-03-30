import { AutocompleteInteraction, ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder, TextChannel } from 'discord.js';
import userId from '../../discord/userId';
import { logger } from '../../services/logger';
import { BotRegistry } from '../bots/botRegistry';

const commandBuilder = new SlashCommandBuilder()
	.setName('bot')
	.setDescription('Manage bot settings')
	.addSubcommand(subcommand =>
		subcommand
			.setName('enable')
			.setDescription('Enable a bot')
			.addStringOption(option =>
				option
					.setName('bot_name')
					.setDescription('Name of the bot to enable')
					.setRequired(true)
					.setAutocomplete(true)
			)
	)
	.addSubcommand(subcommand =>
		subcommand
			.setName('disable')
			.setDescription('Disable a bot')
			.addStringOption(option =>
				option
					.setName('bot_name')
					.setDescription('Name of the bot to disable')
					.setRequired(true)
					.setAutocomplete(true)
			)
	)
	.addSubcommand(subcommand =>
		subcommand
			.setName('frequency')
			.setDescription('Set a reply bot\'s response frequency')
			.addStringOption(option =>
				option
					.setName('bot_name')
					.setDescription('Name of the bot to adjust')
					.setRequired(true)
					.setAutocomplete(true)
			)
			.addIntegerOption(option =>
				option
					.setName('rate')
					.setDescription('Response rate (0-100)')
					.setRequired(true)
					.setMinValue(0)
					.setMaxValue(100)
			)
	)
	.addSubcommand(subcommand =>
		subcommand
			.setName('volume')
			.setDescription('Set a voice bot\'s volume')
			.addStringOption(option =>
				option
					.setName('bot_name')
					.setDescription('Name of the bot to adjust')
					.setRequired(true)
					.setAutocomplete(true)
			)
			.addIntegerOption(option =>
				option
					.setName('volume')
					.setDescription('Volume level (0-100)')
					.setRequired(true)
					.setMinValue(0)
					.setMaxValue(100)
			)
	)
	.addSubcommand(subcommand =>
		subcommand
			.setName('list-bots')
			.setDescription('List all available bots and their status')
	)
	.addSubcommand(subcommand =>
		subcommand
			.setName('report')
			.setDescription('Report a bot to Cova')
			.addStringOption(option =>
				option
					.setName('bot_name')
					.setDescription('Name of the bot to report')
					.setRequired(true)
					.setAutocomplete(true)
			)
			.addStringOption(option =>
				option
					.setName('message')
					.setDescription('Report message explaining the issue')
					.setRequired(true)
			)
	)
	.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export default {
	data: commandBuilder.toJSON(),

	async execute(interaction: ChatInputCommandInteraction): Promise<void> {
		const subcommand = interaction.options.getSubcommand();
		const botRegistry = BotRegistry.getInstance();

		// Check permissions for admin commands
		const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
		const adminCommands = ['enable', 'disable', 'frequency', 'volume', 'list-bots'];
		if (adminCommands.includes(subcommand) && !isAdmin) {
			await interaction.reply({
				content: 'You need administrator permissions to use this command.',
				ephemeral: true
			});
			return;
		}

		try {
			switch (subcommand) {
				case 'enable': {
					const botName = interaction.options.getString('bot_name', true);
					const success = botRegistry.enableBot(botName);
					if (success) {
						await interaction.reply({
							content: `Bot ${botName} has been enabled.`,
							ephemeral: true
						});
					} else {
						await interaction.reply({
							content: `Bot ${botName} not found.`,
							ephemeral: true
						});
					}
					break;
				}
				case 'disable': {
					const botName = interaction.options.getString('bot_name', true);
					const success = botRegistry.disableBot(botName);

					if (success) {
						// Notify Cova about bot disable
						try {
							const cova = await interaction.client.users.fetch(userId.Cova);
							if (cova) {
								await cova.send(`Bot Disabled Notification: ${botName} was disabled by ${interaction.user.tag}`);
							}
						} catch (error) {
							logger.error('[BotCommand] Error notifying Cova about bot disable:', error instanceof Error ? error : new Error(String(error)));
						}

						await interaction.reply({
							content: `Bot ${botName} has been disabled.`,
							ephemeral: true
						});
					} else {
						await interaction.reply({
							content: `Bot ${botName} not found.`,
							ephemeral: true
						});
					}
					break;
				}
				case 'frequency': {
					const botName = interaction.options.getString('bot_name', true);
					const rate = interaction.options.getInteger('rate', true);
					botRegistry.setBotFrequency(botName, rate);
					await interaction.reply({
						content: `Set ${botName}'s response rate to ${rate}%`,
						ephemeral: true
					});
					break;
				}
				case 'volume': {
					const botName = interaction.options.getString('bot_name', true);
					const volume = interaction.options.getInteger('volume', true);
					const bot = botRegistry.getVoiceBot(botName);
					if (bot) {
						bot.setVolume(volume / 100);
						await interaction.reply({
							content: `Set ${botName}'s volume to ${volume}%`,
							ephemeral: true
						});
					} else {
						await interaction.reply({
							content: `Bot ${botName} is not a voice bot or does not exist`,
							ephemeral: true
						});
					}
					break;
				}
				case 'list-bots': {
					const replyBots = botRegistry.getReplyBotNames();
					const voiceBots = botRegistry.getVoiceBotNames();

					if (replyBots.length === 0 && voiceBots.length === 0) {
						await interaction.reply({
							content: 'No bots registered.',
							ephemeral: true
						});
						return;
					}

					let message = '**Available Bots**\n\n';

					if (replyBots.length > 0) {
						message += '**Reply Bots:**\n';
						for (const botName of replyBots) {
							const isEnabled = botRegistry.isBotEnabled(botName);
							const frequency = botRegistry.getBotFrequency(botName);
							message += `- ${botName}: ${isEnabled ? '✅' : '❌'} (${frequency}% response rate)\n`;
						}
						message += '\n';
					}

					if (voiceBots.length > 0) {
						message += '**Voice Bots:**\n';
						for (const botName of voiceBots) {
							const isEnabled = botRegistry.isBotEnabled(botName);
							const bot = botRegistry.getVoiceBot(botName);
							const volume = bot ? Math.round(bot.getVolume() * 100) : 0;
							message += `- ${botName}: ${isEnabled ? '✅' : '❌'} (${volume}% volume)\n`;
						}
					}

					await interaction.reply({
						content: message,
						ephemeral: true
					});
					break;
				}
				case 'report': {
					const botName = interaction.options.getString('bot_name', true);
					const message = interaction.options.getString('message', true);

					const cova = await interaction.client.users.fetch(userId.Cova);
					if (!cova) {
						await interaction.reply({
							content: '❌ Unable to send report: Could not find Cova.',
							ephemeral: true
						});
						return;
					}

					const channelName = interaction.channel instanceof TextChannel ? interaction.channel.name : 'Unknown Channel';
					const report = [
						`**Bot Report**`,
						`**Bot:** ${botName}`,
						`**Reporter:** ${interaction.user.tag} (${interaction.user.id})`,
						`**Server:** ${interaction.guild?.name} (${interaction.guild?.id})`,
						`**Channel:** ${channelName} (${interaction.channel?.id})`,
						`**Message:**`,
						message
					].join('\n');

					try {
						await cova.send(report);
						await interaction.reply({
							content: `✅ Report about \`${botName}\` has been sent to Cova.`,
							ephemeral: true
						});
					} catch (error) {
						logger.error('[BotCommand] Error sending report to Cova:', error instanceof Error ? error : new Error(String(error)));
						await interaction.reply({
							content: '❌ Unable to send report: Failed to send DM to Cova.',
							ephemeral: true
						});
					}
					break;
				}
				default: {
					// Show help text based on permissions
					const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
					let helpText = isAdmin ? '**Bot Manager Commands**\n\n' : '**Bot Commands**\n\n';

					if (isAdmin) {
						helpText += '/bot enable <bot_name> - Enable a bot\n';
						helpText += '/bot disable <bot_name> - Disable a bot\n';
						helpText += '/bot frequency <bot_name> <rate> - Set reply bot response rate\n';
						helpText += '/bot volume <bot_name> <volume> - Set voice bot volume\n';
						helpText += '/bot list-bots - List all available bots\n';
					}
					helpText += '/bot report <bot_name> <message> - Report a bot issue to Cova\n';

					await interaction.reply({
						content: helpText,
						ephemeral: true
					});
				}
			}
		} catch (error) {
			logger.error('Error executing bot command:', error instanceof Error ? error : new Error(String(error)));
			await interaction.reply({
				content: 'An error occurred while executing the command',
				ephemeral: true
			});
		}
	},

	async autocomplete(interaction: AutocompleteInteraction): Promise<void> {
		const focusedValue = interaction.options.getFocused().toLowerCase();
		const subcommand = interaction.options.getSubcommand();
		const botRegistry = BotRegistry.getInstance();

		try {
			let choices: string[];

			// Get appropriate bot names based on subcommand
			if (subcommand === 'volume') {
				choices = botRegistry.getVoiceBotNames();
			} else if (subcommand === 'frequency') {
				choices = botRegistry.getReplyBotNames();
			} else {
				choices = [...botRegistry.getReplyBotNames(), ...botRegistry.getVoiceBotNames()];
			}

			const filtered = choices.filter(choice => choice.toLowerCase().includes(focusedValue));
			await interaction.respond(
				filtered.map(choice => ({ name: choice, value: choice }))
			);
		} catch (error) {
			logger.error('Error in bot command autocomplete:', error instanceof Error ? error : new Error(String(error)));
			await interaction.respond([]);
		}
	}
};
