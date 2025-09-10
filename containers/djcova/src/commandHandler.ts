import { REST, Routes } from 'discord.js';
import fs from 'fs';
// Minimal interaction shape used by this handler (structural typing)
type InteractionLike = {
	commandName: string;
	replied?: boolean;
	deferred?: boolean;
	reply: (opts: { content: string; ephemeral?: boolean }) => Promise<unknown>;
	followUp: (opts: { content: string; ephemeral?: boolean }) => Promise<unknown>;
};

import path from 'path';
import { logger, isDebugMode } from '@starbunk/shared';

// Command interface for DJCova music commands

import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord-api-types/v10';

type CommandData =
	| RESTPostAPIChatInputApplicationCommandsJSONBody
	| { name: string; toJSON?: () => RESTPostAPIChatInputApplicationCommandsJSONBody };
export interface Command {
	data?: CommandData;
	execute: (interaction: InteractionLike) => Promise<void>;
}

export class CommandHandler {
	private commands: Map<string, Command> = new Map();

	constructor() {
		logger.info('Initializing CommandHandler');
	}

	public async registerCommands(): Promise<void> {
		logger.info('Loading commands...');
		try {
			// Determine if we're in development mode
			const isDev = process.env.NODE_ENV === 'development';
			const isDebug = isDebugMode();

			// Setting TS_NODE_DEV for path resolution in TypeScript modules
			if (isDev) {
				process.env.TS_NODE_DEV = 'true';
			}

			// Check if we're running under ts-node
			const isTsNode =
				process.argv[0].includes('ts-node') ||
				(process.env.npm_lifecycle_script && process.env.npm_lifecycle_script.includes('ts-node'));
			logger.debug(`Running with ts-node: ${isTsNode}`);

			// Debug more information about environment
			if (isDebug) {
				logger.debug(
					`Loading commands with: NODE_ENV=${process.env.NODE_ENV}, ts-node=${isTsNode}, __dirname=${__dirname}`,
				);
				logger.debug(`Command: ${process.argv.join(' ')}`);
				if (process.env.npm_lifecycle_script) {
					logger.debug(`npm script: ${process.env.npm_lifecycle_script}`);
				}
			}

			// In dev mode, we want to use .ts files
			const devExtension = '.ts';
			const prodExtension = '.js';

			// Determine the file extension to use based on environment
			const fileExtension = isDev || isTsNode ? devExtension : prodExtension;

			// When running in development or using ts-node, we use the src directory path
			// In production, use the dist directory
			const baseDir = isDev || isTsNode ? process.cwd() + '/src' : process.cwd() + '/dist';
			const commandDir = path.resolve(baseDir, 'commands');

			logger.debug(`Looking for commands in: ${commandDir}`);
			logger.info(`Running in ${isDev ? 'development' : 'production'} mode, looking for ${fileExtension} files`);

			// Find all command files using the direct path
			const commandFiles = fs
				.readdirSync(commandDir)
				.filter((file) => {
					// In development mode, only load .ts files
					if (isDev || isTsNode) {
						return file.endsWith('.ts') && !file.endsWith('.d.ts') && !file.endsWith('adapter.ts');
					}
					// In production mode, only load .js files
					return file.endsWith('.js') && !file.endsWith('adapter.js');
				})
				.map((file) => path.join(commandDir, file));

			logger.info(
				`Found ${commandFiles.length} command files to load: ${commandFiles.map((f) => path.basename(f)).join(', ')}`,
			);

			let successCount = 0;
			for (const commandFile of commandFiles) {
				try {
					logger.info(`Loading command from file: ${path.basename(commandFile)}`);

					// Use a single approach for loading commands
					try {
						// eslint-disable-next-line @typescript-eslint/no-var-requires
						const commandModule = require(commandFile);
						const command = commandModule.default || commandModule;

						if (command?.data && command?.execute) {
							this.registerCommand(command);
							logger.info(`✅ Command loaded successfully: ${command.data.name}`);
							successCount++;
						} else {
							logger.warn(
								`⚠️ Command in file ${path.basename(commandFile)} doesn't match expected format: must have data and execute properties`,
							);
						}
					} catch (error) {
						logger.error(
							`❌ Failed to load command: ${commandFile}`,
							error instanceof Error ? error : new Error(String(error)),
						);
					}
				} catch (error) {
					logger.error(
						`❌ Failed to process command file: ${commandFile}`,
						error instanceof Error ? error : new Error(String(error)),
					);
				}
			}

			logger.info(`📊 Successfully loaded ${successCount} out of ${commandFiles.length} commands`);

			if (successCount > 0) {
				// Register commands with Discord API
				await this.registerDiscordCommands();
				logger.info('Commands registered successfully');
			} else {
				logger.warn('No commands were loaded, skipping Discord API registration');
			}
		} catch (error) {
			logger.error('Error loading commands:', error instanceof Error ? error : new Error(String(error)));
			throw error;
		}
	}

	private async registerDiscordCommands(): Promise<void> {
		try {
			if (!process.env.CLIENT_ID) {
				throw new Error('CLIENT_ID not set in environment variables');
			}

			// Use STARBUNK_TOKEN for authentication
			const token = process.env.STARBUNK_TOKEN;
			if (!token) {
				throw new Error('STARBUNK_TOKEN not set in environment variables');
			}
			const rest = new REST({ version: '10' }).setToken(token);
			const commandData: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];

			// Collect all command data, converting SlashCommandBuilder to JSON if needed
			this.commands.forEach((command: Command) => {
				if (!command.data) return;

				// If the command data is a SlashCommandBuilder or has toJSON method
				if (
					typeof command.data === 'object' &&
					'toJSON' in command.data &&
					typeof command.data.toJSON === 'function'
				) {
					commandData.push(command.data.toJSON());
				} else {
					// Plain object data
					commandData.push(command.data as RESTPostAPIChatInputApplicationCommandsJSONBody);
				}
			});

			logger.debug(`Registering ${commandData.length} commands with Discord API`);
			logger.debug(`Command data: ${JSON.stringify(commandData.map((cmd) => cmd.name))}`);

			// Only register commands if we have some
			if (commandData.length > 0) {
				// Register globally instead of guild-specific for music commands
				await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commandData });

				logger.info('Successfully registered application commands with Discord');
			} else {
				logger.warn('No commands to register with Discord');
			}
		} catch (error) {
			logger.error(
				'Error registering commands with Discord:',
				error instanceof Error ? error : new Error(String(error)),
			);
			throw error;
		}
	}

	public registerCommand(command: Command): void {
		const commandName = command.data?.name || 'unknown';
		logger.debug(`Registering command: ${commandName}`);
		this.commands.set(commandName, command);
	}

	public async handleInteraction(interaction: InteractionLike): Promise<void> {
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
			logger.error(
				`Error executing command ${commandName}:`,
				error instanceof Error ? error : new Error(String(error)),
			);

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
