import { CommandInteraction, SlashCommandBuilder } from 'discord.js';
import { isDebugMode, setDebugMode } from '../../environment';
import { logger } from '@starbunk/shared';

const commandBuilder = new SlashCommandBuilder()
	.setName('debug')
	.setDescription('Debug utilities')
	.addSubcommand(subcommand =>
		subcommand
			.setName('toggle')
			.setDescription('Toggle debug mode on/off')
	)
	.addSubcommand(subcommand =>
		subcommand
			.setName('status')
			.setDescription('Check current debug status')
	)
	.addSubcommand(subcommand =>
		subcommand
			.setName('info')
			.setDescription('Show debugging information')
	);

export default {
	data: commandBuilder.toJSON(),

	async execute(interaction: CommandInteraction) {
		// Only allow certain users to use this command
		const allowedUsers = ['139592376443338752']; // Cova's user ID
		if (!allowedUsers.includes(interaction.user.id)) {
			await interaction.reply({
				content: 'You do not have permission to use this command.',
				ephemeral: true
			});
			return;
		}

		// @ts-expect-error - ChattySlashCommandBuilder does not generate proper types
		const subcommand = interaction.options.getSubcommand();
		let newStatus: string;
		let status: string;
		let debugInfo: Record<string, unknown>;
		let infoMessage: string;

		switch (subcommand) {
			case 'toggle':
				// Toggle debug mode
				setDebugMode(!isDebugMode());
				newStatus = isDebugMode() ? 'enabled' : 'disabled';
				logger.info(`Debug mode ${newStatus}`);
				await interaction.reply({
					content: `Debug mode is now ${newStatus}.`,
					ephemeral: true
				});
				break;

			case 'status':
				// Get current debug status
				status = isDebugMode() ? 'enabled' : 'disabled';
				await interaction.reply({
					content: `Debug mode is currently ${status}.`,
					ephemeral: true
				});
				break;

			case 'info':
				// Get debug information
				debugInfo = {
					nodeEnv: process.env.NODE_ENV,
					debugMode: isDebugMode(),
					platform: process.platform,
					arch: process.arch,
					nodeVersion: process.version,
					uptime: Math.floor(process.uptime()) + ' seconds',
					memoryUsage: process.memoryUsage(),
					timestamp: new Date().toISOString()
				};

				infoMessage = '**Debug Information:**\n```json\n' +
					JSON.stringify(debugInfo, null, 2) +
					'\n```';

				await interaction.reply({
					content: infoMessage,
					ephemeral: true
				});
				break;

			default:
				await interaction.reply({
					content: 'Unknown subcommand',
					ephemeral: true
				});
		}
	},
};
