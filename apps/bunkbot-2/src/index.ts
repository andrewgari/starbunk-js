import * as dotenv from 'dotenv';
import * as path from 'path';
import { BotDiscoveryService } from './reply-bots/services/bot-discovery-service';
import { YamlBotFactory } from './serialization/yaml-bot-factory';
import { BotRegistry } from './reply-bots/bot-registry';
import { Client, GatewayIntentBits, Message } from 'discord.js';
import { DiscordService } from './discord/discord-service';

// Load environment variables from root .env file
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const intents = [
	GatewayIntentBits.Guilds,
	GatewayIntentBits.GuildMessages,
	GatewayIntentBits.MessageContent,
	GatewayIntentBits.GuildMembers,
	GatewayIntentBits.GuildWebhooks,
];
async function main() {
    // Create and login Discord client first
    const client = new Client({ intents });
    const token = process.env.BUNKBOT_TOKEN || process.env.DISCORD_TOKEN;
    if (!token) {
        throw new Error('BUNKBOT_TOKEN or DISCORD_TOKEN environment variable is required');
    }
    await client.login(token);
    console.log(`[BunkBot] Connected to Discord as ${client.user?.tag}`);

    // Initialize Discord service with the client
    const discordService = DiscordService.getInstance();
    discordService.setClient(client);

    // Now load bots (they can use the Discord service)
    const botsDir = process.env.BUNKBOT_BOTS_DIR || path.join(__dirname, '../../../config/bots');
    console.log(`[BunkBot] Loading bots from: ${botsDir}`);

    const registry = new BotRegistry();
    const factory = new YamlBotFactory();
    const discovery = new BotDiscoveryService(factory, registry);
    discovery.discover(botsDir);

    client.on('messageCreate', async (message: Message) => {
      await registry.processmessage(message);
    });
}

process.on('uncaughtException', (error: Error) => {
	console.error('Uncaught exception:', error);
	process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
	console.error('Unhandled promise rejection:', reason);
	process.exit(1);
});

if (require.main === module) {
	main().catch((error: Error) => {
    console.error('Fatal error:', error);
		process.exit(1);
	});
}
