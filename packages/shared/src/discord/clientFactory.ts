// Discord client factory for different container needs
import { Client, GatewayIntentBits, IntentsBitField, ClientOptions } from 'discord.js';
import { logger } from '../services/logger';

export interface ClientConfig {
	intents: readonly GatewayIntentBits[];
	enableVoice?: boolean;
	enableWebhooks?: boolean;
	enablePresence?: boolean;
	additionalOptions?: Partial<ClientOptions>;
}

/**
 * Creates a standard Discord.js client with the specified configuration
 * This is the recommended way to create Discord clients across all containers
 */
export function createDiscordClient(config: ClientConfig): Client {
	const intents = new IntentsBitField();

	// Add required intents
	for (const intent of config.intents) {
		intents.add(intent);
	}

	// Add voice intents if needed
	if (config.enableVoice) {
		intents.add(GatewayIntentBits.GuildVoiceStates);
	}

	// Add webhook intents if needed
	if (config.enableWebhooks) {
		intents.add(GatewayIntentBits.GuildWebhooks);
	}

	// Add presence intents if needed
	if (config.enablePresence) {
		intents.add(GatewayIntentBits.GuildPresences);
	}

	// Merge additional options
	const clientOptions: ClientOptions = {
		intents,
		...config.additionalOptions,
	};

	const client = new Client(clientOptions);

	// Set up basic error handling
	client.on('error', (error) => {
		logger.error('Discord client error:', error);
	});

	client.on('warn', (warning) => {
		logger.warn('Discord client warning:', warning);
	});

	return client;
}

// Predefined configurations for different container types
export const ClientConfigs = {
	// BunkBot: Reply bots and admin commands
	BunkBot: {
		intents: [
			GatewayIntentBits.Guilds,
			GatewayIntentBits.GuildMessages,
			GatewayIntentBits.MessageContent,
			GatewayIntentBits.GuildMembers,
			GatewayIntentBits.GuildIntegrations, // Required for slash commands
		],
		enableWebhooks: true,
	},

	// DJCova: Music service
	DJCova: {
		intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
		enableVoice: true,
	},

	// Starbunk-DND: D&D features and bridge
	StarbunkDND: {
		intents: [
			GatewayIntentBits.Guilds,
			GatewayIntentBits.GuildMessages,
			GatewayIntentBits.MessageContent,
			GatewayIntentBits.GuildMembers,
		],
		enableWebhooks: true,
	},

	// CovaBot: AI personality
	CovaBot: {
		intents: [
			GatewayIntentBits.Guilds,
			GatewayIntentBits.GuildMessages,
			GatewayIntentBits.MessageContent,
			GatewayIntentBits.GuildMembers,
		],
		enableWebhooks: true,
	},
} as const;
