import { AutocompleteInteraction, ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { BotRegistry } from '../bots/botRegistry';

const botCommand = {
	data: new SlashCommandBuilder()
		.setName('bot')
		.setDescription('Manage bot settings')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
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
				.setName('list-bots')
				.setDescription('List all available bots and their status')
		),

	async execute(interaction: ChatInputCommandInteraction) {
		if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
			await interaction.reply({ content: 'You need administrator permissions to use this command.', ephemeral: true });
			return;
		}

		const subcommand = interaction.options.getSubcommand();
		const registry = BotRegistry.getInstance();

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
			case 'list-bots': {
				const botNames = registry.getAllBotNames();
				const botList = botNames
					.map(name => `• \`${name}\`: ${registry.isBotEnabled(name) ? '✅ Enabled' : '❌ Disabled'}`)
					.join('\n');

				const content = botList.length > 0
					? `**Available Bots:**\n${botList}`
					: 'No bots registered.';

				await interaction.reply({ content, ephemeral: true });
				break;
			}
			default: {
				const helpText = `
**Bot Manager Commands**
• \`/bot enable <bot_name>\` - Enable a specific bot
• \`/bot disable <bot_name>\` - Disable a specific bot
• \`/bot list-bots\` - List all available bots and their status
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

