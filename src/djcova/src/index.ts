// DJCova - Music service container
import { runSmokeMode } from '@starbunk/shared/health/smoke-mode';

import { logger } from '@starbunk/shared';
import { ensureError } from './utils';

const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');

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

// Main execution
async function main(): Promise<void> {
	if (process.env.CI_SMOKE_MODE === 'true') {
		logger.info('CI_SMOKE_MODE enabled: starting minimal health server and skipping Discord login');
		runSmokeMode();
		return;
	}

	const client = new Client({ intents: [GatewayIntentBits.Guilds] });
	client.on(Events.ClientReady, () => {
		logger.info('DJCova is ready and connected to Discord');
	});

	client.commands = new Collection();

	const foldersPath = path.join(__dirname, 'commands');
	const commandFolders = fs.readdirSync(foldersPath);

	for (const folder of commandFolders) {
		const commandsPath = path.join(foldersPath, folder);
		const commandFiles = fs.readdirSync(commandsPath).filter((file: string) => file.endsWith('.ts'));
		for (const file of commandFiles) {
			const filePath = path.join(commandsPath, file);
			const command = require(filePath);
			// Set a new item in the Collection with the key as the command name and the value as the exported module
			if ('data' in command && 'execute' in command) {
				client.commands.set(command.data.name, command);
			} else {
				console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
			}
		}
	}
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
