// Discord client factory for different container needs
import { Client, GatewayIntentBits, IntentsBitField } from 'discord.js';
import { logger } from '../services/logger';

export interface ClientConfig {
	intents: readonly GatewayIntentBits[];
	enableVoice?: boolean;
	enableWebhooks?: boolean;
}

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

	const client = new Client({ intents });

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
		],
		enableWebhooks: true,
	},

	// DJCova: Music service
	DJCova: {
		intents: [
			GatewayIntentBits.Guilds,
			GatewayIntentBits.GuildMessages,
			GatewayIntentBits.MessageContent,
		],
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
