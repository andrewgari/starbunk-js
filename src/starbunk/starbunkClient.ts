import { PlayerSubscription } from '@discordjs/voice';
import { Base, ClientOptions, Collection, Events, Message, REST, Routes, VoiceState } from 'discord.js';
import { readdirSync } from 'fs';
import path from 'path';
import { Command } from '../discord/command';
import DiscordClient from '../discord/discordClient';
import loggerAdapter from '../services/loggerAdapter';
import { EventDebug } from '../utils/eventDebug';
import ReplyBot from './bots/replyBot';
import VoiceBot from './bots/voiceBot';
import { DJCova } from './djCova';

export default class StarbunkClient extends DiscordClient {
	bots: Collection<string, ReplyBot> = new Collection();
	voiceBots: Collection<string, VoiceBot> = new Collection();
	commands: Collection<string, Command> = new Collection();
	djCova: DJCova = new DJCova();
	activeSubscription: PlayerSubscription | undefined;
	private readonly fileExtension: string = process.env.NODE_ENV === 'development' ? '.ts' : '.js';

	constructor(options: ClientOptions) {
		super(options);
	}

	getMusicPlayer(): DJCova {
		return this.djCova;
	}

	// Event handlers
	handleMessage(message: Message): void {
		this.bots.forEach((bot) => bot.handleMessage(message));
	}

	handleVoiceEvent(oldState: VoiceState, newState: VoiceState): void {
		this.voiceBots.forEach((bot) => bot.handleEvent(oldState, newState));
	}

	// Registration methods
	async registerBots(): Promise<void> {
		try {
			const botDir = path.join(__dirname, 'bots/reply-bots');
			loggerAdapter.info(`Looking for bots in: ${botDir}`);
			const botFiles = readdirSync(botDir).filter((file) => file.endsWith(this.fileExtension));
			loggerAdapter.info(`Found bot files: ${botFiles.join(', ')}`);

			for (const file of botFiles) {
				try {
					const botName = file.split('.')[0];
					const importPath = path.join(botDir, file);
					loggerAdapter.info(`Importing bot from: ${importPath}`);

					const imported = await import(importPath);
					const BotClass = imported.default;

					if (!BotClass) {
						throw new Error(`Could not load bot class for ${botName}`);
					}

					const bot = new BotClass() as ReplyBot;
					this.bots.set(botName, bot);
					loggerAdapter.success(`Registered Bot: ${botName} 🤖`);
				} catch (error) {
					loggerAdapter.error(`Failed to load bot from ${file}: ${error instanceof Error ? error.message : String(error)}`);
					if (error instanceof Error && error.stack) {
						loggerAdapter.error(`Stack trace: ${error.stack}`);
					}
				}
			}
		} catch (error) {
			loggerAdapter.error(`Error in registerBots: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	async registerVoiceBots(): Promise<void> {
		try {
			const botDir = path.join(__dirname, 'bots/voice-bots');
			loggerAdapter.info(`Looking for voice bots in: ${botDir}`);
			const botFiles = readdirSync(botDir).filter((file) => file.endsWith(this.fileExtension));
			loggerAdapter.info(`Found voice bot files: ${botFiles.join(', ')}`);

			for (const file of botFiles) {
				try {
					const botName = file.split('.')[0];
					const importPath = path.join(botDir, file);
					loggerAdapter.info(`Importing voice bot from: ${importPath}`);

					const imported = await import(importPath);
					const BotClass = imported.default;

					if (!BotClass) {
						throw new Error(`Could not load voice bot class for ${botName}`);
					}

					const bot = new BotClass();
					this.voiceBots.set(botName, bot);
					loggerAdapter.success(`Registered Voice Bot: ${botName} 🎤`);
				} catch (error) {
					loggerAdapter.error(`Failed to load voice bot from ${file}: ${error instanceof Error ? error.message : String(error)}`);
					if (error instanceof Error && error.stack) {
						loggerAdapter.error(`Stack trace: ${error.stack}`);
					}
				}
			}
		} catch (error) {
			loggerAdapter.error(`Error in registerVoiceBots: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	async registerCommands(): Promise<void> {
		try {
			const commandDir = path.join(__dirname, 'commands');
			loggerAdapter.info(`Looking for commands in: ${commandDir}`);
			const commandFiles = readdirSync(commandDir).filter((file) => file.endsWith(this.fileExtension));
			loggerAdapter.info(`Found command files: ${commandFiles.join(', ')}`);

			for (const file of commandFiles) {
				try {
					const importPath = path.join(commandDir, file);
					loggerAdapter.info(`Importing command from: ${importPath}`);

					const imported = await import(importPath);
					const command = imported.default;

					if (!command) {
						throw new Error(`Could not load command from ${file}`);
					}

					this.commands.set(command.data.name, command);
					loggerAdapter.success(`Registered Command: ${command.data.name} ⚡`);
				} catch (error) {
					loggerAdapter.error(`Failed to load command from ${file}: ${error instanceof Error ? error.message : String(error)}`);
					if (error instanceof Error && error.stack) {
						loggerAdapter.error(`Stack trace: ${error.stack}`);
					}
				}
			}
		} catch (error) {
			loggerAdapter.error(`Error in registerCommands: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	// Main initialization method
	bootstrap(token: string, clientId: string, guildId: string): void {
		try {
			loggerAdapter.info('🚀 Starting Starbunk initialization...');
			this.registerBots();
			this.registerVoiceBots();
			this.registerCommands();
			this.setupEventListeners();
			this.registerSlashCommands(token, clientId, guildId);
			EventDebug.monitorEvents(this);
			this.login(token);
		} catch (error) {
			loggerAdapter.error(`Error during initialization: ${error}`);
		}
	}

	private setupEventListeners(): void {
		this.on(Events.MessageCreate, (message) => {
			loggerAdapter.debug(`Received message: ${message.content.substring(0, 50)}...`);
			this.handleMessage(message);
		});

		this.on(Events.MessageUpdate, (_, message) => {
			if (message.author?.bot) return;
			loggerAdapter.debug(`Message updated: ${message.content.substring(0, 50)}...`);
			this.handleMessage(message as Message);
		});

		this.on(Events.VoiceStateUpdate, (oldState, newState) => {
			loggerAdapter.info('🎤 Registering voice event handlers...');
			loggerAdapter.debug('Voice state update detected');
			this.handleVoiceEvent(oldState, newState);
		});

		this.on(Events.InteractionCreate, async (interaction) => {
			if (!interaction.isChatInputCommand()) return;
			loggerAdapter.info('👂 Listening for commands...');

			const command = this.commands.get(interaction.commandName);

			if (!command) {
				loggerAdapter.warn(`Unknown command received: ${interaction.commandName}`);
				return;
			}

			try {
				loggerAdapter.debug(`Executing command: ${interaction.commandName}`);
				await command.execute(interaction);
			} catch (error) {
				console.error(error);
				await interaction.reply({
					content: 'There was an error while executing this command!',
					ephemeral: true,
				});
			}
		});
	}

	private registerSlashCommands(token: string, clientId: string, guildId: string): void {
		loggerAdapter.info('⚡ Registering slash commands...');
		const commands = [];
		for (const command of this.commands.values()) {
			commands.push(command.data);
		}

		const rest = new REST({ version: '10' }).setToken(token);

		rest
			.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
			.then(() => loggerAdapter.success('Successfully registered application commands.'))
			.catch(console.error);
	}
}

export const getStarbunkClient = (base: Base): StarbunkClient => {
	return base.client as StarbunkClient;
};
