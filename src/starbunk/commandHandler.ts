import { Collection, CommandInteraction, REST, RESTPostAPIChatInputApplicationCommandsJSONBody, Routes } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { Command } from '../discord/command';
import { isDebugMode } from '../environment';
import { logger } from '../services/logger';
import { loadCommand } from '../util/moduleLoader';

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
			const isDebug = isDebugMode();

			// Check if we're running under ts-node
			const isTsNode = process.argv[0].includes('ts-node') ||
				(process.env.npm_lifecycle_script && process.env.npm_lifecycle_script.includes('ts-node'));
			logger.debug(`Running with ts-node: ${isTsNode}`);

			// Debug more information about environment
			if (isDebug) {
				logger.debug(`Loading commands with: NODE_ENV=${process.env.NODE_ENV}, ts-node=${isTsNode}, __dirname=${__dirname}`);
				logger.debug(`Command: ${process.argv.join(' ')}`);
				if (process.env.npm_lifecycle_script) {
					logger.debug(`npm script: ${process.env.npm_lifecycle_script}`);
				}
			}

			// In dev mode, we want to use .ts files
			const devExtension = '.ts';
			const prodExtension = '.js';

			// Determine the file extension to use based on environment
			const fileExtension = (isDev || isTsNode) ? devExtension : prodExtension;

			// When running in development or using ts-node, we use the src directory path
			const commandDir = path.resolve('./src/starbunk/commands');

			logger.debug(`Looking for commands in: ${commandDir}`);
			logger.info(`Running in ${isDev ? 'development' : 'production'} mode, looking for ${fileExtension} files`);

			// Find all command files using the direct path
			const commandFiles = fs.readdirSync(commandDir)
				.filter(file => file.endsWith(fileExtension) && !file.endsWith('.d.ts') && !file.endsWith('adapter.ts'))
				.map(file => path.join(commandDir, file));

			logger.info(`Found ${commandFiles.length} command files to load: ${commandFiles.map(f => path.basename(f)).join(', ')}`);

			let successCount = 0;
			for (const commandFile of commandFiles) {
				try {
					logger.info(`Loading command from file: ${path.basename(commandFile)}`);

					// Try direct require first which works better in our diagnostic script
					try {
						logger.info(`Attempting direct require for ${path.basename(commandFile)}`);
						// eslint-disable-next-line @typescript-eslint/no-var-requires
						const commandModule = require(commandFile.replace(/\.ts$/, ''));

						if (commandModule) {
							let command = null;

							// Check if it's a direct command object
							if (commandModule.data && commandModule.execute) {
								command = commandModule;
							}
							// Check if it's in the default export
							else if (commandModule.default && commandModule.default.data && commandModule.default.execute) {
								command = commandModule.default;
							}

							if (command) {
								this.registerCommand(command);
								logger.info(`✅ Command loaded successfully via require: ${command.data.name}`);
								successCount++;
								continue; // Skip to next command file
							} else {
								logger.warn(`⚠️ No valid command found in module: ${path.basename(commandFile)}`);
							}
						} else {
							logger.warn(`⚠️ No module loaded from require: ${path.basename(commandFile)}`);
						}
					} catch (requireError: unknown) {
						const errorMessage = requireError instanceof Error
							? requireError.message
							: 'Unknown error';
						logger.warn(`⚠️ Direct require failed for ${path.basename(commandFile)}: ${errorMessage}`);
						// Continue to try the loadCommand utility
					}

					// Fall back to loadCommand utility
					const command = await loadCommand(commandFile);

					if (command) {
						this.registerCommand(command);
						logger.info(`✅ Command loaded successfully via loadCommand: ${command.data.name}`);
						successCount++;
					} else {
						logger.warn(`⚠️ No command object returned from: ${commandFile}`);
					}
				} catch (error) {
					logger.error(`❌ Failed to load command: ${commandFile}`, error instanceof Error ? error : new Error(String(error)));
				}
			}

			logger.info(`📊 Successfully loaded ${successCount} out of ${commandFiles.length} commands`);

			if (successCount > 0) {
				// Register commands with Discord API
				await this.registerDiscordCommands();
				logger.info('Commands registered successfully');
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
