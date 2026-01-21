import 'dotenv/config';
import { Client, GatewayIntentBits, Message } from 'discord.js';
import { setupBlueBotLogging } from '../src/observability/setup-logging';
import { logger } from '../src/observability/logger';
import { getResponseForMessage } from '../src/strategy/strategy-router';

// Setup logging mixins before creating any logger instances
setupBlueBotLogging();

// Simple ANSI color codes
const colors = {
	reset: '\x1b[0m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	cyan: '\x1b[36m',
	gray: '\x1b[90m',
	white: '\x1b[37m',
	red: '\x1b[31m',
};

const intents = [
	GatewayIntentBits.Guilds,
	GatewayIntentBits.GuildMessages,
	GatewayIntentBits.MessageContent,
];

async function main(): Promise<void> {
	const token = process.env.BLUEBOT_TESTER_TOKEN || process.env.DISCORD_TOKEN;

	if (!token) {
		logger.error('Discord token not found in environment variables');
		throw new Error('BLUEBOT_TESTER_TOKEN or DISCORD_TOKEN environment variable is required');
	}

	const client = new Client({ intents });

	logger.info('BlueBot Tester starting...');
	logger.info('This tester will listen to messages and display BlueBot responses in console');
	logger.info('It will NOT send messages to Discord');

	await client.login(token);

	client.once('ready', () => {
		logger.info(`BlueBot Tester connected as ${client.user?.tag}`);
		console.log(`${colors.green}\n=== BlueBot Tester Ready ===${colors.reset}`);
		console.log(`${colors.cyan}Listening for messages...\n${colors.reset}`);
	});

	client.on('messageCreate', async (message: Message) => {
		// Skip bot messages
		if (message.author.bot) return;

		try {
			const response = await getResponseForMessage(message);

			// Log to console with formatting
			console.log(`${colors.gray}${'─'.repeat(80)}${colors.reset}`);
			console.log(`${colors.blue}📨 Message:${colors.reset}`);
			console.log(`${colors.white}   Author: ${message.author.tag} (${message.author.id})${colors.reset}`);
			console.log(`${colors.white}   Channel: ${message.channel.id}${colors.reset}`);
			console.log(`${colors.white}   Content: "${message.content}"${colors.reset}`);

			if (response) {
				console.log(`${colors.green}✅ BlueBot Response:${colors.reset}`);
				console.log(`${colors.yellow}   "${response}"${colors.reset}`);
			} else {
				console.log(`${colors.gray}⏭️  No response (no strategy matched)${colors.reset}`);
			}
			console.log(`${colors.gray}${'─'.repeat(80)}\n${colors.reset}`);

			// Also log structured data for debugging
			logger
				.withMetadata({
					message_id: message.id,
					author_id: message.author.id,
					author_tag: message.author.tag,
					channel_id: message.channelId,
					content: message.content,
					response: response || 'NO_RESPONSE',
				})
				.info('Message processed');
		} catch (error) {
			logger.withError(error).error('Error processing message');
			console.log(`${colors.red}❌ Error: ${error}${colors.reset}`);
		}
	});

	// Set up graceful shutdown handlers
	const shutdown = async (signal: string) => {
		logger.info(`Received ${signal}, shutting down gracefully...`);
		console.log(`${colors.yellow}\n\nShutting down BlueBot Tester...${colors.reset}`);
		client.destroy();
		process.exit(0);
	};

	process.on('SIGINT', () => shutdown('SIGINT'));
	process.on('SIGTERM', () => shutdown('SIGTERM'));
}

if (require.main === module) {
	main().catch((error) => {
		logger.withError(error).error('Fatal error during BlueBot Tester startup');
		console.error(`${colors.red}Fatal error:${colors.reset}`, error);
		process.exit(1);
	});
}

