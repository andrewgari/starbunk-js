import { Client, GatewayIntentBits } from 'discord.js';
import { logger } from '@starbunk/shared';

/**
 * Create a Discord client configured for music bot functionality
 * Only requires minimal intents: Guilds and GuildVoiceStates
 */
export function createDiscordClient(): Client {
	const client = new Client({
		intents: [
			GatewayIntentBits.Guilds, // Basic functionality
			GatewayIntentBits.GuildVoiceStates, // Voice connections
		],
	});

	// Set up basic error handling
	client.on('error', (error) => logger.error('Discord client error:', error));
	client.on('warn', (warning) => logger.warn('Discord client warning:', { warning }));

	return client;
}

/**
 * Login to Discord with retry logic
 */
export async function loginToDiscord(client: Client, token: string): Promise<void> {
	// Validate token format
	if (!token.match(/^[\w-]+\.[\w-]+\.[\w-]+$/)) {
		logger.error('❌ Invalid Discord token format');
		throw new Error('DISCORD_TOKEN appears to be invalid (incorrect format)');
	}

	const maxRetries = 3;
	let lastError: Error | undefined;

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			logger.info(`Attempting Discord login (attempt ${attempt}/${maxRetries})...`);
			await client.login(token);
			logger.info('✅ Discord login successful');
			return;
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));
			logger.error(`❌ Discord login attempt ${attempt}/${maxRetries} failed:`, lastError);

			// Check for invalid token (no point retrying)
			if (lastError.message.includes('TOKEN_INVALID') || lastError.message.includes('Incorrect login')) {
				logger.error('❌ Discord token is invalid - cannot retry');
				throw new Error(`Invalid Discord token: ${lastError.message}`);
			}

			// Exponential backoff before retry
			if (attempt < maxRetries) {
				const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
				logger.info(`Retrying in ${delay}ms...`);
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}
	}

	throw new Error(`Failed to connect to Discord after ${maxRetries} attempts: ${lastError?.message}`);
}

