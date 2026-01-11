import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
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

			// Use __dirname to get the directory where this code is running from
			// In development with ts-node: __dirname = /path/to/apps/djcova/src
			// In production: __dirname = /app/apps/djcova/dist
			// Both cases: commands are in __dirname/commands
			const commandDir = path.resolve(__dirname, 'commands');

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
			// Get token and client ID from environment (mapped in docker-compose.yml)
			const token = process.env.DISCORD_TOKEN;
			if (!token) {
				throw new Error('DISCORD_TOKEN not set in environment variables');
			}

			const clientId = process.env.CLIENT_ID;
			if (!clientId) {
				throw new Error('CLIENT_ID not set in environment variables');
			}

			logger.info(`🎵 Registering DJCova commands with client ID: ${clientId}`);

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
				// Get guild IDs from environment
				const guildIds = (process.env.TESTING_SERVER_IDS || process.env.GUILD_ID || '')
					.split(',')
					.map((s: string) => s.trim())
					.filter(Boolean);

				if (guildIds.length > 0) {
					// Register commands to guilds in parallel for better performance
					// Guild commands update instantly, unlike global commands which take up to 1 hour
					const registrationPromises = guildIds.map(async (gid: string) => {
						try {
							await rest.put(Routes.applicationGuildCommands(clientId, gid), { body: commandData });
							logger.info(`Registered ${commandData.length} commands to guild ${gid}`);
						} catch (error) {
							logger.error(
								`Failed to register commands to guild ${gid}:`,
								error instanceof Error ? error : new Error(String(error)),
							);
							throw error;
						}
					});

					await Promise.all(registrationPromises);
				} else {
					// Fallback to global registration (takes up to 1 hour to propagate)
					logger.warn('No TESTING_SERVER_IDS or GUILD_ID set - registering commands globally (may take up to 1 hour to appear)');
					await rest.put(Routes.applicationCommands(clientId), { body: commandData });
					logger.info('Successfully registered application commands globally');
				}
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
