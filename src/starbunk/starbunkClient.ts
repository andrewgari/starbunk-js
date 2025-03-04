import { PlayerSubscription } from '@discordjs/voice';
import { Base, ClientOptions, Collection, Events, Message, REST, Routes, VoiceState } from 'discord.js';
import { readdirSync } from 'fs';
import path from 'path';
import { Command } from '../discord/command';
import DiscordClient from '../discord/discordClient';
import LoggerAdapter from '../services/LoggerAdapter';
import ReplyBot from './bots/replyBot';
import VoiceBot from './bots/voiceBot';
import { DJCova } from './dJCova';

export default class StarbunkClient extends DiscordClient {
	bots: Collection<string, ReplyBot> = new Collection();
	voiceBots: Collection<string, VoiceBot> = new Collection();
	commands: Collection<string, Command> = new Collection();
	djCova: DJCova = new DJCova();
	activeSubscription: PlayerSubscription | undefined;

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
		const botDir = path.join(__dirname, 'bots/reply-bots');
		const botFiles = readdirSync(botDir).filter((file) => file.endsWith('.js'));

		for (const file of botFiles) {
			try {
				const botName = file.split('.')[0];
				const { default: BotClass } = await import(path.join(botDir, file));
				const bot = new BotClass();
				this.bots.set(botName, bot);
				LoggerAdapter.success(`Registered Bot: ${botName} 🤖`);
			} catch (error) {
				LoggerAdapter.error(`Failed to load bot from ${file}: ${error}`);
			}
		}
	}

	async registerVoiceBots(): Promise<void> {
		const botDir = path.join(__dirname, 'bots/voice-bots');
		const botFiles = readdirSync(botDir).filter((file) => file.endsWith('.js'));

		for (const file of botFiles) {
			try {
				const botName = file.split('.')[0];
				const { default: BotClass } = await import(path.join(botDir, file));
				const bot = new BotClass();
				this.voiceBots.set(botName, bot);
				LoggerAdapter.success(`Registered Voice Bot: ${botName} 🎤`);
			} catch (error) {
				LoggerAdapter.error(`Failed to load voice bot from ${file}: ${error}`);
			}
		}
	}

	async registerCommands(): Promise<void> {
		const commandDir = path.join(__dirname, 'commands');
		const commandFiles = readdirSync(commandDir).filter((file) => file.endsWith('.js'));

		for (const file of commandFiles) {
			try {
				const { default: command } = await import(path.join(commandDir, file));
				this.commands.set(command.data.name, command);
				LoggerAdapter.success(`Registered Command: ${command.data.name} ⚡`);
			} catch (error) {
				LoggerAdapter.error(`Failed to load command from ${file}: ${error}`);
			}
		}
	}

	// Main initialization method
	bootstrap(token: string, clientId: string, guildId: string): void {
		try {
			LoggerAdapter.info('🚀 Starting Starbunk initialization...');
			this.registerBots();
			this.registerVoiceBots();
			this.registerCommands();
			this.setupEventListeners();
			this.registerSlashCommands(token, clientId, guildId);
			this.login(token);
		} catch (error) {
			LoggerAdapter.error(`Error during initialization: ${error}`);
		}
	}

	private setupEventListeners(): void {
		this.on(Events.MessageCreate, (message) => {
			LoggerAdapter.debug(`Received message: ${message.content.substring(0, 50)}...`);
			this.handleMessage(message);
		});

		this.on(Events.MessageUpdate, (_, message) => {
			if (message.author?.bot) return;
			LoggerAdapter.debug(`Message updated: ${message.content.substring(0, 50)}...`);
			this.handleMessage(message as Message);
		});

		this.on(Events.VoiceStateUpdate, (oldState, newState) => {
			LoggerAdapter.info('🎤 Registering voice event handlers...');
			LoggerAdapter.debug('Voice state update detected');
			this.handleVoiceEvent(oldState, newState);
		});

		this.on(Events.InteractionCreate, async (interaction) => {
			if (!interaction.isChatInputCommand()) return;
			LoggerAdapter.info('👂 Listening for commands...');

			const command = this.commands.get(interaction.commandName);

			if (!command) {
				LoggerAdapter.warn(`Unknown command received: ${interaction.commandName}`);
				return;
			}

			try {
				LoggerAdapter.debug(`Executing command: ${interaction.commandName}`);
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
		LoggerAdapter.info('⚡ Registering slash commands...');
		const commands = [];
		for (const command of this.commands.values()) {
			commands.push(command.data);
		}

		const rest = new REST({ version: '10' }).setToken(token);

		rest
			.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
			.then(() => LoggerAdapter.success('Successfully registered application commands.'))
			.catch(console.error);
	}
}

export const getStarbunkClient = (base: Base): StarbunkClient => {
	return base.client as StarbunkClient;
};
