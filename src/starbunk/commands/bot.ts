import { AutocompleteInteraction, ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder, TextChannel } from 'discord.js';
import userId from '../../discord/userId';
import { logger } from '../../services/logger';
import { BotRegistry } from '../bots/botRegistry';

const botCommand = {
	data: new SlashCommandBuilder()
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
				.setDescription('Set a bot\'s response frequency')
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
		),

	async execute(interaction: ChatInputCommandInteraction) {
		const subcommand = interaction.options.getSubcommand();
		const registry = BotRegistry.getInstance();

		// Check if user has admin permissions for admin-only commands
		const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ?? false;
		const adminCommands = ['enable', 'disable', 'frequency', 'list-bots'];

		if (adminCommands.includes(subcommand) && !isAdmin) {
			await interaction.reply({
				content: 'You need administrator permissions to use this command.',
				ephemeral: true
			});
			return;
		}

		switch (subcommand) {
			case 'enable': {
				const botName = interaction.options.getString('bot_name', true);
				const success = registry.enableBot(botName);
				if (success) {
					await interaction.reply({ content: `✅ Bot \`${botName}\` has been enabled.`, ephemeral: true });
				} else {
					await interaction.reply({ content: `❌ Bot \`${botName}\` not found.`, ephemeral: true });
				}
				break;
			}
			case 'disable': {
				const botName = interaction.options.getString('bot_name', true);
				const success = registry.disableBot(botName);
				if (success) {
					await interaction.reply({ content: `✅ Bot \`${botName}\` has been disabled.`, ephemeral: true });
				} else {
					await interaction.reply({ content: `❌ Bot \`${botName}\` not found.`, ephemeral: true });
				}
				break;
			}
			case 'frequency': {
				const botName = interaction.options.getString('bot_name', true);
				const rate = interaction.options.getInteger('rate', true);
				const success = registry.setBotFrequency(botName, rate);
				if (success) {
					await interaction.reply({
						content: `✅ Bot \`${botName}\` response rate set to ${rate}%.`,
						ephemeral: true
					});
				} else {
					await interaction.reply({
						content: `❌ Bot \`${botName}\` not found.`,
						ephemeral: true
					});
				}
				break;
			}
			case 'list-bots': {
				const botNames = registry.getAllBotNames();
				logger.debug(`[BotCommand] Found ${botNames.length} bots`);

				const botList = botNames
					.map(name => {
						const status = registry.isBotEnabled(name) ? '✅' : '❌';
						const rate = registry.getBotFrequency(name);
						logger.debug(`[BotCommand] Bot ${name}: status=${status}, rate=${rate}%`);
						return `• \`${name}\` ${status} (${rate}%)`;
					})
					.join('\n');

				const content = botList.length > 0
					? `**Available Bots:**\n${botList}`
					: 'No bots registered.';

				logger.debug(`[BotCommand] Sending bot list:\n${content}`);
				await interaction.reply({ content, ephemeral: true });
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
				const helpText = isAdmin ? `
**Bot Manager Commands**
• \`/bot enable <bot_name>\` - Enable a specific bot
• \`/bot disable <bot_name>\` - Disable a specific bot
• \`/bot frequency <bot_name> <rate>\` - Set bot response rate (0-100%)
• \`/bot list-bots\` - List all available bots and their status
• \`/bot report <bot_name> <message>\` - Report a bot to Cova
                `.trim() : `
**Bot Commands**
• \`/bot report <bot_name> <message>\` - Report a bot to Cova
                `.trim();
				await interaction.reply({ content: helpText, ephemeral: true });
			}
		}
	},

	async autocomplete(interaction: AutocompleteInteraction) {
		const focusedValue = interaction.options.getFocused().toString();
		const registry = BotRegistry.getInstance();
		const choices = registry.getAllBotNames();

		const filtered = choices.filter(choice =>
			choice.toLowerCase().includes(focusedValue.toLowerCase())
		);

		await interaction.respond(
			filtered.map(choice => ({ name: choice, value: choice }))
		);
	}
};

export default botCommand;

