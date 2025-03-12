// Register module aliases for path resolution
import { GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import 'module-alias/register';
import { resolve } from 'path';
import { bootstrapApplication } from './services/bootstrap';
import SnowbunkClient from './snowbunk/snowbunkClient';
import StarbunkClient from './starbunk/starbunkClient';

// Register path aliases
import moduleAlias from 'module-alias';
moduleAlias.addAliases({
	'@': resolve(__dirname)
});

dotenv.config();

const starbunk = new StarbunkClient({
	intents: [
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildWebhooks,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.MessageContent,
	],
});

const snowbunk = new SnowbunkClient({
	intents: [
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.Guilds,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildWebhooks,
	],
});

const runStarbunkBot = async (): Promise<void> => {
	// Bootstrap services before initializing the bot
	await bootstrapApplication(starbunk);
	starbunk.bootstrap(process.env.STARBUNK_TOKEN!, process.env.CLIENT_ID!, process.env.GUILD_ID!);
	await starbunk.login(process.env.STARBUNK_TOKEN);
};

const runSnowbunkBot = async (): Promise<void> => {
	// Bootstrap services for snowbunk as well
	await bootstrapApplication(snowbunk);
	snowbunk.bootstrap();
	await snowbunk.login(process.env.SNOWBUNK_TOKEN);
};

const runBots = async (): Promise<void> => {
	try {
		await Promise.all([
			runStarbunkBot().catch(error => {
				console.error('Starbunk Error:', error);
				throw error;
			}),
			runSnowbunkBot().catch(error => {
				console.error('Snowbunk Error:', error);
				throw error;
			})
		]);
	} catch (error) {
		console.error('Failed to start bots:', error);
		process.exit(1);
	}
};

runBots().then();
