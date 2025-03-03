import { PlayerSubscription } from '@discordjs/voice';
import { Base, ClientOptions, Collection, Events, Message, REST, Routes, VoiceState } from 'discord.js';
import { readdirSync } from 'fs';
import { Command } from '../discord/command';
import DiscordClient from '../discord/discordClient';
import { Logger } from '../services/Logger';
import ReplyBot from './bots/replyBot';
import VoiceBot from './bots/voiceBot';
import { DJCova } from './dJCova';

export default class StarbunkClient extends DiscordClient {
	bots: Collection<string, ReplyBot> = new Collection();
	voiceBots: Collection<string, VoiceBot> = new Collection();
	commands: Collection<string, Command> = new Collection();
	djCova: DJCova = new DJCova();
	activeSubscription: PlayerSubscription | undefined;

	getMusicPlayer = (): DJCova => {
		return this.djCova;
	};

	constructor(options: ClientOptions) {
		super(options);
	}

	handleMessage = (message: Message): void => {
		this.bots.forEach((bot: ReplyBot) => {
			bot.handleMessage(message);
		});
	};

	handleVoiceEvent = (oldState: VoiceState, newState: VoiceState): void => {
		this.voiceBots.forEach((bot: VoiceBot) => {
			bot.handleEvent(oldState, newState);
		});
	};

	registerBots = async (): Promise<void> => {
		for (const file of readdirSync('./src/starbunk/bots/reply-bots')) {
			const fileName = file.replace('.ts', '');
			await import(`./bots/reply-bots/${fileName}`).then((botModule) => {
				if (!botModule) return;

				// Get the constructor from either default or named export
				const BotConstructor = botModule.default || botModule;
				if (!BotConstructor) return;

				try {
					const bot = new BotConstructor(this) as ReplyBot;
					if (!bot || !bot.defaultBotName() || this.bots.find((b) => b.defaultBotName() === bot.defaultBotName())) {
						return;
					}
					this.bots.set(bot.defaultBotName(), bot);
					Logger.success(`Registered Bot: ${bot.defaultBotName()} 🤖`);
				} catch (error) {
					Logger.error(`Failed to initialize bot from ${fileName}: ${error}`);
				}
			});
		}
	};

	registerVoiceBots = async (): Promise<void> => {
		for (const file of readdirSync('./src/starbunk/bots/voice-bots')) {
			const fileName = file.replace('.ts', '');
			await import(`./bots/voice-bots/${fileName}`).then((botClass) => {
				if (!botClass) return;
				const bot = new botClass.default(this) as VoiceBot;
				if (!bot || !bot.defaultBotName() || this.voiceBots.find((b) => b.defaultBotName() === bot.defaultBotName())) {
					return;
				}
				this.voiceBots.set(bot.defaultBotName(), bot);
				Logger.success(`Registered Voice Bot: ${bot.defaultBotName()} 🎤`);
			});
		}
	};

	registerCommands = async (): Promise<void> => {
		for (const file of readdirSync('./src/starbunk/commands/')) {
			const fileName = file.replace('.ts', '');
			await import(`./commands/${fileName}`).then((cmd) => {
				const command = cmd.default;
				if (!command || !command?.data?.name || this.commands.find((c) => c.data.name === command.data.name)) {
					return;
				}
				this.commands.set(command.data.name, command);
				Logger.success(`Registered Command: ${command.data.name} ⚡`);
			});
		}
	};

	bootstrap(token: string, clientId: string, guildId: string): void {
		const rest = new REST({ version: '9' }).setToken(token);
		const promises = [this.registerBots(), this.registerCommands(), this.registerVoiceBots()];

		Logger.info('🚀 Starting Starbunk initialization...');
		Promise.all(promises).then();

		this.on(Events.MessageCreate, async (message: Message) => {
			Logger.debug(`Received message: ${message.content.substring(0, 50)}...`);
			this.handleMessage(message);
		});

		this.on(Events.MessageUpdate, async (_oldMessage, newMessage) => {
			const message = await newMessage.fetch();
			Logger.debug(`Message updated: ${message.content.substring(0, 50)}...`);
			this.handleMessage(message);
		});

		Logger.info('🎤 Registering voice event handlers...');
		this.on(Events.VoiceStateUpdate, async (oldState, newState) => {
			Logger.debug('Voice state update detected');
			this.handleVoiceEvent(oldState, newState);
		});

		Logger.info('⚡ Registering slash commands...');
		rest.put(Routes.applicationGuildCommands(clientId, guildId), {
			body: this.commands.map((command) => command.data),
		});

		Logger.info('👂 Listening for commands...');
		this.on(Events.InteractionCreate, async (interaction) => {
			if (!interaction.isCommand()) return;
			const command = this.commands.get(interaction.commandName);
			if (!command) {
				Logger.warn(`Unknown command received: ${interaction.commandName}`);
				return;
			}
			Logger.debug(`Executing command: ${interaction.commandName}`);
			command.execute(interaction);
		});
	}
}

export const getStarbunkClient = (base: Base): StarbunkClient => {
	return base.client as StarbunkClient;
};
