import { Client, Interaction, AutocompleteInteraction, ChatInputCommandInteraction, RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord.js';
import { logger } from '../observability/logger';

// Import commands
import pingCommand from './ping';
import clearwebhooksCommand from './clearwebhooks';
import botCommand from './bot';

// Command interface
export interface Command {
	data: RESTPostAPIChatInputApplicationCommandsJSONBody;
	execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
	autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
}

/**
 * Registry of all available commands
 */
class CommandRegistry {
	private commands: Map<string, Command>;

	constructor() {
		this.commands = new Map<string, Command>();
		this.registerCommands();
	}

	/**
	 * Register all commands
	 */
	private registerCommands() {
		this.commands.set('ping', pingCommand);
		this.commands.set('clearwebhooks', clearwebhooksCommand);
		this.commands.set('bot', botCommand);
		
		logger.info(`Registered ${this.commands.size} commands: ${Array.from(this.commands.keys()).join(', ')}`);
	}

	/**
	 * Get a command by name
	 */
	getCommand(name: string): Command | undefined {
		return this.commands.get(name);
	}

	/**
	 * Get all command data for deployment
	 */
	getCommandData(): RESTPostAPIChatInputApplicationCommandsJSONBody[] {
		return Array.from(this.commands.values()).map((cmd) => cmd.data);
	}

	/**
	 * Get the number of registered commands
	 */
	getCommandCount(): number {
		return this.commands.size;
	}
}

/**
 * Deploy commands to Discord
 */
export async function deployCommands(client: Client, registry: CommandRegistry): Promise<void> {
	logger.info('Deploying slash commands to Discord...');
	const commandData = registry.getCommandData();
	const guildId = process.env.GUILD_ID;

	if (guildId) {
		logger.info(`Deploying commands to guild ${guildId}`);
		const guild = await client.guilds.fetch(guildId);
		await guild.commands.set(commandData);
	} else {
		logger.info('Deploying commands globally');
		await client.application!.commands.set(commandData);
	}
	
	logger.info(`Successfully deployed ${commandData.length} slash commands`);
}

/**
 * Set up interaction handlers for commands
 */
export function setupCommandHandlers(client: Client, registry: CommandRegistry): void {
	logger.info('Registering command interaction handlers');
	
	client.on('interactionCreate', async (interaction: Interaction) => {
		if (interaction.isChatInputCommand()) {
			try {
				const command = registry.getCommand(interaction.commandName);
				if (command) {
					logger.info('Executing command', {
						command_name: interaction.commandName,
						user_id: interaction.user.id,
						guild_id: interaction.guildId,
					});
					await command.execute(interaction);
				} else {
					logger.warn('Unknown command', { command_name: interaction.commandName });
					await interaction.reply({
						content: `Unknown command: ${interaction.commandName}`,
						ephemeral: true,
					});
				}
			} catch (error) {
				logger.error('Error executing command', error, {
					command_name: interaction.commandName,
				});
				if (!interaction.replied && !interaction.deferred) {
					await interaction.reply({
						content: 'An error occurred while executing the command.',
						ephemeral: true,
					});
				}
			}
		} else if (interaction.isAutocomplete()) {
			try {
				const command = registry.getCommand(interaction.commandName);
				if (command?.autocomplete) {
					await command.autocomplete(interaction);
				}
			} catch (error) {
				logger.error('Error in autocomplete', error, {
					command_name: interaction.commandName,
				});
			}
		}
	});
}

/**
 * Initialize commands: register, deploy, and set up handlers
 */
export async function initializeCommands(client: Client): Promise<CommandRegistry> {
	const registry = new CommandRegistry();
	await deployCommands(client, registry);
	setupCommandHandlers(client, registry);
	return registry;
}

