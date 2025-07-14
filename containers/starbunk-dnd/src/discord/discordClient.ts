// Discord client for starbunk-dnd
import { Client, GatewayIntentBits } from 'discord.js';
import { logger } from '@starbunk/shared';

export default class DiscordClient extends Client {
	constructor() {
		super({
			intents: [
				GatewayIntentBits.Guilds,
				GatewayIntentBits.GuildMessages,
				GatewayIntentBits.MessageContent,
				GatewayIntentBits.GuildMembers
			]
		});

		this.setupEventHandlers();
	}

	private setupEventHandlers(): void {
		this.on('ready', () => {
			logger.info(`Starbunk-DND Discord client ready as ${this.user?.tag}`);
		});

		this.on('error', (error) => {
			logger.error('Discord client error', error);
		});

		this.on('warn', (warning) => {
			logger.warn('Discord client warning', warning);
		});
	}

	async initialize(): Promise<void> {
		const token = process.env.STARBUNK_TOKEN;
		if (!token) {
			throw new Error('STARBUNK_TOKEN is required');
		}

		await this.login(token);
		logger.info('Starbunk-DND Discord client initialized');
	}

	async shutdown(): Promise<void> {
		await this.destroy();
		logger.info('Starbunk-DND Discord client shut down');
	}
}
