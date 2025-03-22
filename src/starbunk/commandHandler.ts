import { Collection, CommandInteraction, REST, RESTPostAPIChatInputApplicationCommandsJSONBody, Routes } from 'discord.js';
import path, { join } from 'path';
import { Command } from '../discord/command';
import { logger } from '../services/logger';
import { loadCommand, scanDirectory } from '../util/moduleLoader';

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
			// Determine if we're in development mode
			const isDev = process.env.NODE_ENV === 'development';

			// Check if we're running under ts-node
			const isTsNode = process.argv[0].includes('ts-node') ||
				(process.env.npm_lifecycle_script && process.env.npm_lifecycle_script.includes('ts-node'));
			logger.debug(`Running with ts-node: ${isTsNode}`);

			// We need to check both src and dist directories
			const srcPath = join(__dirname.replace('/dist/', '/src/'), 'commands');
			const distPath = join(__dirname, 'commands');

			// Try src directory first in development mode or when using ts-node
			const primaryPath = (isDev || isTsNode) ? srcPath : distPath;
			const primaryExt = (isDev || isTsNode) ? '.ts' : '.js';
			const backupPath = (isDev || isTsNode) ? distPath : srcPath;
			const backupExt = (isDev || isTsNode) ? '.js' : '.ts';

			logger.debug(`Primary directory: ${primaryPath} with extension ${primaryExt}`);
			logger.debug(`Backup directory: ${backupPath} with extension ${backupExt}`);

			// First try the primary path
			let commandFiles = scanDirectory(primaryPath, primaryExt)
				.filter(file => !file.endsWith('adapter.js') && !file.endsWith('adapter.ts'));

			// If no files found, try the backup path
			if (commandFiles.length === 0) {
				logger.debug(`No files found in primary path, trying backup path: ${backupPath}`);
				commandFiles = scanDirectory(backupPath, backupExt)
					.filter(file => !file.endsWith('adapter.js') && !file.endsWith('adapter.ts'));
			}

			// Last resort: try both extensions in both directories
			if (commandFiles.length === 0) {
				logger.debug(`Still no files found, trying all combinations`);
				commandFiles = [
					...scanDirectory(primaryPath, '.ts'),
					...scanDirectory(primaryPath, '.js'),
					...scanDirectory(backupPath, '.ts'),
					...scanDirectory(backupPath, '.js')
				].filter(file => !file.endsWith('adapter.js') && !file.endsWith('adapter.ts'));
			}

			logger.info(`Found ${commandFiles.length} command files to load: ${commandFiles.map(f => path.basename(f)).join(', ')}`);

			let successCount = 0;
			for (const commandFile of commandFiles) {
				try {
					logger.info(`Loading command from file: ${commandFile}`);
					const command = await loadCommand(commandFile);

					if (command) {
						logger.info(`✅ Command loaded successfully: ${command.data.name}`);
						this.commands.set(command.data.name, command);
						successCount++;
					} else {
						logger.warn(`⚠️ No command instance returned from: ${commandFile}`);
					}
				} catch (error) {
					logger.error(`❌ Failed to load command: ${commandFile}`, error instanceof Error ? error : new Error(String(error)));
				}
			}

			logger.info(`📊 Successfully loaded ${successCount} out of ${commandFiles.length} commands`);

			if (successCount > 0) {
				logger.info('📋 Loaded commands summary:');
				this.commands.forEach((_, name) => {
					logger.info(`   - ${name}`);
				});
			}

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
