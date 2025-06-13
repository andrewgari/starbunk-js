import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { logger } from '../../services/logger';

// Define command data
const data = new SlashCommandBuilder()
	.setName('rpghelp')
	.setDescription('Lists all available RPG commands and their descriptions');

// List of all RPG commands with descriptions
const commands = [
	{
		group: 'Campaign',
		commands: [
			{ name: '/rpg campaign create', description: 'Create a new campaign with a specified name and system' },
			{ name: '/rpg campaign list', description: 'View all available campaigns' },
			{ name: '/rpg campaign set-active', description: 'Set a campaign as active in the current channel' },
			{ name: '/rpg campaign rename', description: 'Rename the current campaign' },
			{ name: '/rpg campaign link-channels', description: 'Link text and voice channels for a campaign' }
		]
	},
	{
		group: 'Session',
		commands: [
			{ name: '/rpg session schedule', description: 'Schedule a gaming session with date, time, and title' },
			{ name: '/rpg session skip', description: 'Skip a recurring session on a specific date' },
			{ name: '/rpg session reminder', description: 'Set a reminder for an upcoming session' }
		]
	},
	{
		group: 'Character',
		commands: [
			{ name: '/rpg character create', description: 'Create a new character for the current campaign' },
			{ name: '/rpg character list', description: 'List all characters in the current campaign' }
		]
	},
	{
		group: 'Game',
		commands: [
			{ name: '/rpg game create', description: 'Create a new game session' },
			{ name: '/rpg game ask', description: 'Ask a question about the game (visible to all players)' },
			{ name: '/rpg game ask-gm', description: 'Ask a GM-only question about the game' },
			{ name: '/rpg game note', description: 'Add a note that will be saved as vector embedding for search' }
		]
	},
	{
		group: 'Vector',
		commands: [
			{ name: '/rpg vector search', description: 'Search for game content using vector embeddings' },
			{ name: '/rpg vector add-file', description: 'Add a file to the vector database' }
		]
	}
];

// Format commands into a nice message
function formatCommandsHelp(): string {
	let helpMessage = '# 🎲 RPG Commands Help 🎲\n\n';

	commands.forEach(group => {
		helpMessage += `## ${group.group} Commands\n`;

		group.commands.forEach(cmd => {
			helpMessage += `- **${cmd.name}** - ${cmd.description}\n`;
		});

		helpMessage += '\n';
	});

	helpMessage += 'For more detailed help on a specific command, use the command with the `help` option.\n';
	helpMessage += 'Example: `/rpg campaign create help:Get help`';

	return helpMessage;
}

export default {
	data: data.toJSON(),
	async execute(interaction: ChatInputCommandInteraction): Promise<void> {
		try {
			// Format the help message
			const helpMessage = formatCommandsHelp();

			// Reply with the help message
			await interaction.reply({
				content: helpMessage,
				ephemeral: true // Only visible to the user who ran the command
			});

			logger.info(`User ${interaction.user.tag} requested RPG help`);
		} catch (error) {
			logger.error('Error executing rpghelp command:', error instanceof Error ? error : new Error(String(error)));

			// Reply with error message
			await interaction.reply({
				content: 'There was an error displaying the RPG help. Please try again later.',
				ephemeral: true
			});
		}
	}
};
