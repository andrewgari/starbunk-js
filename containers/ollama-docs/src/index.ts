import { Client, GatewayIntentBits, Collection, REST, Routes } from 'discord.js';
import { logger } from '@starbunk/shared';
import docsCommand from './services/discord/commands/docs';
import * as path from 'path';

// Environment validation
const requiredEnvVars = ['DISCORD_TOKEN', 'CLIENT_ID'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
	logger.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
	process.exit(1);
}

const DISCORD_TOKEN = process.env.DISCORD_TOKEN!;
const CLIENT_ID = process.env.CLIENT_ID!;
const GUILD_ID = process.env.GUILD_ID; // Optional for guild-specific commands

// Create Discord client
const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
});

// Command collection
const commands = new Collection<string, any>();
commands.set(docsCommand.data.name, docsCommand);

// Event handlers
client.once('ready', async () => {
	logger.info(`🤖 Ollama Document Assistant logged in as ${client.user?.tag}`);
	
	// Register slash commands
	await registerCommands();
	
	logger.info('🚀 Ollama Document Assistant is ready!');
});

client.on('interactionCreate', async (interaction) => {
	if (!interaction.isChatInputCommand()) return;

	const command = commands.get(interaction.commandName);
	if (!command) {
		logger.warn(`❌ Unknown command: ${interaction.commandName}`);
		return;
	}

	try {
		logger.info(`🎯 Executing command: ${interaction.commandName} by ${interaction.user.username}`);
		await command.execute(interaction);
	} catch (error) {
		logger.error(`❌ Error executing command ${interaction.commandName}:`, error instanceof Error ? error : new Error(String(error)));
		
		const errorMessage = 'There was an error while executing this command!';
		
		if (interaction.replied || interaction.deferred) {
			await interaction.editReply({ content: errorMessage });
		} else {
			await interaction.reply({ content: errorMessage, ephemeral: true });
		}
	}
});

// Error handling
client.on('error', (error) => {
	logger.error('❌ Discord client error:', error);
});

process.on('unhandledRejection', (reason, promise) => {
	logger.error('❌ Unhandled Rejection at:', promise instanceof Error ? promise : new Error(String(promise)), 'reason:', reason);
});

process.on('uncaughtException', (error) => {
	logger.error('❌ Uncaught Exception:', error);
	process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
	logger.info('🛑 Received SIGINT, shutting down gracefully...');
	client.destroy();
	process.exit(0);
});

process.on('SIGTERM', async () => {
	logger.info('🛑 Received SIGTERM, shutting down gracefully...');
	client.destroy();
	process.exit(0);
});

// Register slash commands
async function registerCommands() {
	try {
		logger.info('🔄 Registering slash commands...');

		const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

		const commandData = Array.from(commands.values()).map(command => command.data);

		if (GUILD_ID) {
			// Register guild-specific commands (faster for development)
			await rest.put(
				Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
				{ body: commandData }
			);
			logger.info(`✅ Successfully registered ${commandData.length} guild commands for guild ${GUILD_ID}`);
		} else {
			// Register global commands (takes up to 1 hour to propagate)
			await rest.put(
				Routes.applicationCommands(CLIENT_ID),
				{ body: commandData }
			);
			logger.info(`✅ Successfully registered ${commandData.length} global commands`);
		}

	} catch (error) {
		logger.error('❌ Failed to register commands:', error instanceof Error ? error : new Error(String(error)));
	}
}

// Health check endpoint (optional)
if (process.env.ENABLE_HEALTH_CHECK === 'true') {
	const express = require('express');
	const app = express();
	const port = process.env.HEALTH_CHECK_PORT || 3000;

	app.get('/health', (req: any, res: any) => {
		res.json({
			status: 'healthy',
			uptime: process.uptime(),
			timestamp: new Date().toISOString(),
			discord: client.isReady() ? 'connected' : 'disconnected',
		});
	});

	app.listen(port, () => {
		logger.info(`🏥 Health check endpoint available at http://localhost:${port}/health`);
	});
}

// Start the bot
async function start() {
	try {
		logger.info('🚀 Starting Ollama Document Assistant...');
		
		// Validate Ollama connection
		const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
		logger.info(`🦙 Connecting to Ollama at: ${ollamaUrl}`);
		
		// Login to Discord
		await client.login(DISCORD_TOKEN);
		
	} catch (error) {
		logger.error('❌ Failed to start bot:', error instanceof Error ? error : new Error(String(error)));
		process.exit(1);
	}
}

// Start the application
start();
