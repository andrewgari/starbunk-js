import { PlayerSubscription } from '@discordjs/voice';
import { Base, Client, ClientOptions, Collection, GatewayIntentBits, Message, REST, Routes, VoiceState } from 'discord.js';
import { readdirSync } from 'fs';
import path from 'path';
import { Command } from '../discord/command';
import DiscordClient from '../discord/discordClient';
import { logger } from '../services/logger';
import ReplyBot from './bots/replyBot';
import { VoiceBot } from './bots/voiceBot';
import { DJCova } from './djCova';

export default class StarbunkClient extends DiscordClient {
	bots: Collection<string, ReplyBot> = new Collection();
	voiceBots: Collection<string, VoiceBot> = new Collection();
	commands: Collection<string, Command> = new Collection();
	djCova: DJCova;
	activeSubscription: PlayerSubscription | undefined;
	private readonly fileExtension: string = process.env.NODE_ENV === 'development' ? '.ts' : '.js';
	private client: Client;

	constructor(options: ClientOptions) {
		logger.info('Initializing StarbunkClient');
		super(options);
		this.djCova = new DJCova();
		this.client = new Client({
			intents: [
				GatewayIntentBits.Guilds,
				GatewayIntentBits.GuildMessages,
				GatewayIntentBits.MessageContent,
				GatewayIntentBits.GuildVoiceStates
			]
		});
		logger.debug('Discord client created with required intents');

		this.client.on('ready', () => {
			logger.info(`Logged in as ${this.client.user?.tag}`);
			this.loadBots();
			this.loadCommands();
		});

		this.client.on('messageCreate', async (message: Message) => {
			logger.debug(`Received message from ${message.author.tag} in channel ${message.channel.id}`);
			await this.handleMessage(message);
		});

		this.client.on('error', (error: Error) => {
			logger.error('Discord client error:', error);
		});

		this.client.on('warn', (warning: string) => {
			logger.warn('Discord client warning:', warning);
		});

		this.client.on('debug', (info: string) => {
			logger.debug('Discord client debug:', info);
		});

		this.client.on('voiceStateUpdate', async (oldState: VoiceState, newState: VoiceState) => {
			logger.debug(`Voice state update for user ${newState.member?.user.tag}`);
			try {
				await this.handleVoiceStateUpdate(oldState, newState);
				logger.debug('Voice state update handled successfully');
			} catch (error) {
				logger.error('Error handling voice state update:', error as Error);
			}
		});

		logger.info('StarbunkClient initialized successfully');
	}

	getMusicPlayer(): DJCova {
		return this.djCova;
	}

	private async loadBots(): Promise<void> {
		logger.info('Loading bots');
		try {
			const botsPath = path.join(__dirname, 'bots', 'reply-bots');
			const botFiles = readdirSync(botsPath).filter(file => file.endsWith(this.fileExtension));

			for (const file of botFiles) {
				try {
					const { default: Bot } = await import(path.join(botsPath, file));
					const bot = new Bot();
					this.bots.set(bot.defaultBotName, bot);
					logger.debug(`Loaded bot: ${bot.defaultBotName}`);
				} catch (error) {
					logger.error(`Error loading bot from file ${file}:`, error as Error);
				}
			}

			logger.info(`Successfully loaded ${this.bots.size} bots`);
		} catch (error) {
			logger.error('Failed to load bots:', error as Error);
			throw error;
		}
	}

	private async loadCommands(): Promise<void> {
		logger.info('Loading commands');
		try {
			const commandsPath = path.join(__dirname, 'commands');
			const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith(this.fileExtension));

			for (const file of commandFiles) {
				try {
					const { default: Command } = await import(path.join(commandsPath, file));
					const command = new Command();
					this.commands.set(command.name, command);
					logger.debug(`Loaded command: ${command.name}`);
				} catch (error) {
					logger.error(`Error loading command from file ${file}:`, error as Error);
				}
			}

			logger.info(`Successfully loaded ${this.commands.size} commands`);
		} catch (error) {
			logger.error('Failed to load commands:', error as Error);
			throw error;
		}
	}

	private async handleMessage(message: Message): Promise<void> {
		logger.debug(`Processing message "${message.content.substring(0, 100)}..." through ${this.bots.size} bots`);

		try {
			const promises = this.bots.map(async (bot) => {
				try {
					logger.debug(`Sending message to bot: ${bot.defaultBotName}`);
					await bot.auditMessage(message);
					logger.debug(`Bot ${bot.defaultBotName} finished processing message`);
				} catch (error) {
					logger.error(`Error in bot ${bot.defaultBotName} while processing message:`, error as Error);
				}
			});

			await Promise.all(promises);
			logger.debug('All bots finished processing message');
		} catch (error) {
			logger.error('Error handling message across bots:', error as Error);
		}
	}

	private async handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
		logger.debug(`Processing voice state update for user ${newState.member?.user.tag}`);

		try {
			const promises = this.voiceBots.map(async (bot) => {
				try {
					logger.debug(`Sending voice state update to bot: ${bot.constructor.name}`);
					await bot.onVoiceStateUpdate(oldState, newState);
					logger.debug(`Bot ${bot.constructor.name} finished processing voice state update`);
				} catch (error) {
					logger.error(`Error in bot ${bot.constructor.name} while processing voice state update:`, error as Error);
				}
			});

			await Promise.all(promises);
			logger.debug('All voice bots finished processing voice state update');
		} catch (error) {
			logger.error('Error handling voice state update across bots:', error as Error);
		}
	}

	public async registerCommands(): Promise<void> {
		logger.info('Registering commands');
		try {
			const rest = new REST().setToken(process.env.DISCORD_TOKEN as string);
			const commandData = Array.from(this.commands.values()).map(command => command.data);

			logger.debug(`Registering ${commandData.length} commands with Discord API`);
			await rest.put(
				Routes.applicationCommands(process.env.CLIENT_ID as string),
				{ body: commandData }
			);
			logger.info('Successfully registered commands');
		} catch (error) {
			logger.error('Failed to register commands:', error as Error);
			throw error;
		}
	}

	public override async destroy(): Promise<void> {
		logger.info('Destroying StarbunkClient');
		try {
			await this.client.destroy();
			logger.info('Successfully destroyed Discord client');
		} catch (error) {
			logger.error('Error destroying Discord client:', error as Error);
			throw error;
		}
	}
}

export const getStarbunkClient = (base: Base): StarbunkClient => {
	return base.client as StarbunkClient;
};
