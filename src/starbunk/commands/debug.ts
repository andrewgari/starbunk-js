import { CommandInteraction, SlashCommandBuilder } from 'discord.js';
import { logger } from '../../services/logger';
import { DebugUtils } from '../../utils/debug';

export default {
	data: new SlashCommandBuilder()
		.setName('debug')
		.setDescription('Toggle debug mode or get debug information')
		.addSubcommand(subcommand =>
			subcommand
				.setName('toggle')
				.setDescription('Toggle debug mode on/off')
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('status')
				.setDescription('Get current debug status')
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('info')
				.setDescription('Get detailed debug information')
		),
	async execute(interaction: CommandInteraction) {
		// Only allow admins to use this command
		if (!interaction.memberPermissions?.has('Administrator')) {
			await interaction.reply({
				content: 'You do not have permission to use this command.',
				ephemeral: true
			});
			return;
		}

		// @ts-expect-error - getSubcommand exists on CommandInteractionOptionResolver
		const subcommand = interaction.options.getSubcommand();
		let newStatus: string;
		let status: string;
		let debugInfo: Record<string, unknown>;
		let infoMessage: string;

		switch (subcommand) {
			case 'toggle':
			// Toggle debug mode
				process.env.DEBUG_MODE = process.env.DEBUG_MODE === 'true' ? 'false' : 'true';
				newStatus = process.env.DEBUG_MODE === 'true' ? 'enabled' : 'disabled';
				logger.info(`Debug mode ${newStatus}`);
				await interaction.reply({
					content: `Debug mode is now ${newStatus}.`,
					ephemeral: true
				});
				break;

			case 'status':
			// Get current debug status
				status = DebugUtils.isDebugMode() ? 'enabled' : 'disabled';
				await interaction.reply({
					content: `Debug mode is currently ${status}.`,
					ephemeral: true
				});
				break;

			case 'info':
			// Get detailed debug information
				debugInfo = {
					debugMode: DebugUtils.isDebugMode(),
					environment: process.env.NODE_ENV,
					platform: process.platform,
					nodeVersion: process.version,
					uptime: Math.floor(process.uptime()) + ' seconds',
					memoryUsage: process.memoryUsage(),
					guildId: interaction.guildId,
					channelId: interaction.channelId
				};

				infoMessage = '**Debug Information:**\n```json\n';
				infoMessage += JSON.stringify(debugInfo, null, 2);
				infoMessage += '\n```';

				await interaction.reply({
					content: infoMessage,
					ephemeral: true
				});
				break;

			default:
				await interaction.reply({
					content: 'Unknown subcommand.',
					ephemeral: true
				});
		}
	},
};
