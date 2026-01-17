// DJCova - Music service container
import { runSmokeMode } from '@starbunk/shared/health/smoke-mode';
import { logger } from '@starbunk/shared';
import { ensureError } from './utils';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Client, Collection, Events, GatewayIntentBits, ChatInputCommandInteraction } from 'discord.js';

export type ChatInputInteraction = {
	isChatInputCommand(): boolean;
	commandName: string;
	reply: (opts: { content: string; ephemeral?: boolean }) => Promise<unknown>;
	followUp: (opts: { content: string; ephemeral?: boolean }) => Promise<unknown>;
	user?: { username?: string };
	deferred?: boolean;
	replied?: boolean;
	channelId?: string;
	guildId?: string;
};

type Command = {
	data: { name: string };
	execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
};
// Main execution
async function main(): Promise<void> {
	if (process.env.CI_SMOKE_MODE === 'true') {
		logger.info('CI_SMOKE_MODE enabled: starting minimal health server and skipping Discord login');
		runSmokeMode();
		return;
	}

	const token = process.env.DISCORD_TOKEN;
	if (!token) {
		throw new Error('DISCORD_TOKEN environment variable is required');
	}

	const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] }) as Client & {
		commands: Collection<string, Command>;
	};

	client.on(Events.ClientReady, () => {
		logger.info('DJCova is ready and connected to Discord');
	});

	client.commands = new Collection();

	const foldersPath = path.join(__dirname, 'commands');

	// Validate commands directory exists and is a directory
	let commandEntries: string[] = [];
	if (fs.existsSync(foldersPath)) {
		const folderStats = fs.statSync(foldersPath);
		if (folderStats.isDirectory()) {
			commandEntries = fs.readdirSync(foldersPath);
		} else {
			logger.warn(`[WARNING] The commands path ${foldersPath} exists but is not a directory. No commands will be loaded from it.`);
		}
	} else {
		logger.warn(`[WARNING] The commands directory ${foldersPath} does not exist. No commands will be loaded.`);
	}

	// Determine file extension based on environment (development uses .ts, production uses .js)
	const commandExtension = __filename.endsWith('.ts') ? '.ts' : '.js';

	// Handle both flat structure (commands/*.ext) and nested structure (commands/folder/*.ext)
	for (const entry of commandEntries) {
		const entryPath = path.join(foldersPath, entry);
		const stats = fs.statSync(entryPath);

		if (stats.isFile() && entry.endsWith(commandExtension)) {
			// Direct file in commands directory
			const command = require(entryPath);
			if ('data' in command && 'execute' in command) {
				client.commands.set(command.data.name, command);
			} else {
				logger.warn(`[WARNING] The command at ${entryPath} is missing a required "data" or "execute" property.`);
			}
		} else if (stats.isDirectory()) {
			// Subdirectory with command files
			const commandFiles = fs.readdirSync(entryPath).filter((file: string) => file.endsWith(commandExtension));
			for (const file of commandFiles) {
				const filePath = path.join(entryPath, file);
				const command = require(filePath);
				if ('data' in command && 'execute' in command) {
					client.commands.set(command.data.name, command);
				} else {
					logger.warn(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
				}
			}
		}
	}

	// Register interaction handler
	client.on(Events.InteractionCreate, async (interaction) => {
		if (!interaction.isChatInputCommand()) return;

		const command = client.commands.get(interaction.commandName);
		if (!command) {
			logger.error(`No command matching ${interaction.commandName} was found.`);
			return;
		}

		try {
			await command.execute(interaction);
		} catch (error) {
			logger.error('Error executing command:', ensureError(error));
			const reply = { content: 'There was an error executing this command!', ephemeral: true };
			if (interaction.replied || interaction.deferred) {
				await interaction.followUp(reply);
			} else {
				await interaction.reply(reply);
			}
		}
	});

	// Login to Discord
	await client.login(token);
}

// Graceful shutdown
process.on('SIGINT', async () => {
	logger.info('Received SIGINT signal, shutting down DJCova...');
	process.exit(0);
});

process.on('SIGTERM', async () => {
	logger.info('Received SIGTERM signal, shutting down DJCova...');
	process.exit(0);
});

// Global error handlers to properly log unhandled errors with structured logging
process.on('uncaughtException', (error: Error) => {
	logger.error('Uncaught exception:', error);
	process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
	const error = ensureError(reason);
	logger.error('Unhandled promise rejection:', error);
	process.exit(1);
});

if (require.main === module) {
	main().catch((error) => {
		logger.error('Fatal error in main:', ensureError(error));
		process.exit(1);
	});
}
