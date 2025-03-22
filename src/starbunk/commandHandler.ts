import { Collection, CommandInteraction, REST, RESTPostAPIChatInputApplicationCommandsJSONBody, Routes } from 'discord.js';
import { join } from 'path';
import { Command } from '../discord/command';
import { logger } from '../services/logger';
import { loadCommand, scanDirectory } from '../util/moduleLoader.js';

export class CommandHandler {
	private commands: Collection<string, Command> = new Collection();

	constructor() {
		logger.info('Initializing CommandHandler');
	}

	public async registerCommands(): Promise<void> {
		// Feature flag to skip loading until module format issues are resolved
		const usePlaceholderCommands = false;

		if (usePlaceholderCommands) {
			logger.warn('Using placeholder commands due to module loading issues');
			logger.info(`Loaded 0 commands successfully`);
			return;
		}

		logger.info('Loading commands...');
		try {
			const commandsPath = join(__dirname, 'commands');
			logger.debug(`Looking for commands in: ${commandsPath}`);

			const commandFiles = scanDirectory(
				commandsPath,
				'.js' // Always use .js for compiled files in the dist directory
			).filter(file => !file.endsWith('adapter.js') && !file.endsWith('adapter.ts'));

			logger.debug(`Found ${commandFiles.length} command files`);

			let successCount = 0;
			for (const commandFile of commandFiles) {
				try {
					logger.debug(`Loading command from: ${commandFile}`);
					const command = await loadCommand(commandFile);

					if (command) {
						logger.debug(`Command loaded successfully: ${command.data.name}`);
						this.commands.set(command.data.name, command);
						successCount++;
					}
				} catch (error) {
					logger.error(`Failed to load command: ${commandFile}`, error instanceof Error ? error : new Error(String(error)));
				}
			}

			logger.info(`Successfully loaded ${successCount} out of ${commandFiles.length} commands`);

			// Register commands with Discord API
			if (this.commands.size > 0) {
				logger.info('Registering commands with Discord API');
				await this.registerDiscordCommands();
			} else {
				logger.warn('No commands to register with Discord API');
			}
		} catch (error) {
			logger.error('Error loading commands:', error instanceof Error ? error : new Error(String(error)));
		}
	}

	private async registerDiscordCommands(): Promise<void> {
		try {
			if (!process.env.CLIENT_ID) {
				throw new Error('CLIENT_ID not set in environment variables');
			}

			if (!process.env.GUILD_ID) {
				throw new Error('GUILD_ID not set in environment variables');
			}

			const rest = new REST({ version: '9' }).setToken(process.env.TOKEN || '');
			const commandData: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];

			// Collect all command data, converting SlashCommandBuilder to JSON if needed
			this.commands.forEach(command => {
				if (!command.data) return;

				// If the command data is a SlashCommandBuilder or has toJSON method
				if (typeof command.data === 'object' && 'toJSON' in command.data && typeof command.data.toJSON === 'function') {
					commandData.push(command.data.toJSON());
				} else {
					// Plain object data
					commandData.push(command.data as RESTPostAPIChatInputApplicationCommandsJSONBody);
				}
			});

			logger.debug(`Registering ${commandData.length} commands with Discord API`);

			// Only register commands if we have some
			if (commandData.length > 0) {
				await rest.put(
					Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
					{ body: commandData }
				);

				logger.info('Successfully registered application commands with Discord');
			} else {
				logger.warn('No commands to register with Discord');
			}
		} catch (error) {
			logger.error('Error registering commands with Discord:', error instanceof Error ? error : new Error(String(error)));
		}
	}

	public registerCommand(command: Command): void {
		const commandName = command.data?.name || 'unknown';
		logger.debug(`Registering command: ${commandName}`);
		this.commands.set(commandName, command);
	}

	public async handleInteraction(interaction: CommandInteraction): Promise<void> {
		const commandName = interaction.commandName;
		const command = this.commands.get(commandName);

		if (!command) {
			logger.warn(`Command ${commandName} not found`);
			return;
		}

		try {
			logger.debug(`Executing command: ${commandName}`);
			await command.execute(interaction);
			logger.debug(`Command ${commandName} executed successfully`);
		} catch (error) {
			logger.error(`Error executing command ${commandName}:`, error instanceof Error ? error : new Error(String(error)));

			// Respond to the user with an error message
			const errorMessage = 'There was an error executing this command.';
			if (interaction.replied || interaction.deferred) {
				await interaction.followUp({ content: errorMessage, ephemeral: true });
			} else {
				await interaction.reply({ content: errorMessage, ephemeral: true });
			}
		}
	}
}
