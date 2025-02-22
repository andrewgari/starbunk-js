import { Command } from '@/discord/command';
import DiscordClient from '@/discord/discordClient';
import { Logger } from '@/services/logger';
import { PlayerSubscription } from '@discordjs/voice';
import { Base, ClientOptions, Collection, Events, Message, REST, Routes, VoiceState } from 'discord.js';
import { readdirSync } from 'fs';
import ReplyBot from './bots/replyBot';
import VoiceBot from './bots/voiceBot';
import { DJCova } from './dJCova';

interface StarbunkConfig extends ClientOptions {
	logger?: typeof Logger;
}

export default class StarbunkClient extends DiscordClient {
	private readonly logger: typeof Logger;
	bots: Collection<string, ReplyBot> = new Collection();
	voiceBots: Collection<string, VoiceBot> = new Collection();
	commands: Collection<string, Command> = new Collection();
	djCova: DJCova = new DJCova();
	activeSubscription: PlayerSubscription | undefined;

	getMusicPlayer = (): DJCova => {
		return this.djCova;
	};

	constructor(options: StarbunkConfig) {
		super(options);
		this.logger = options.logger ?? Logger;
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
			await import(`./bots/reply-bots/${fileName}`).then((botClass) => {
				if (!botClass) return;
				const bot = new botClass.default(this) as ReplyBot;
				if (!bot || !bot.getBotName() || this.bots.find((b) => b.getBotName() === bot.getBotName())) {
					return;
				}
				this.bots.set(bot.getBotName(), bot);
				this.logger.success(`Registered Bot: ${bot.getBotName()} 🤖`);
			});
		}
	};

	registerVoiceBots = async (): Promise<void> => {
		for (const file of readdirSync('./src/starbunk/bots/voice-bots')) {
			const fileName = file.replace('.ts', '');
			await import(`./bots/voice-bots/${fileName}`).then((botClass) => {
				if (!botClass) return;
				const bot = new botClass.default(this) as VoiceBot;
				if (!bot || !bot.getBotName() || this.bots.find((b) => b.getBotName() === bot.getBotName())) {
					return;
				}
				this.voiceBots.set(bot.getBotName(), bot);
				this.logger.success(`Registered Voice Bot: ${bot.getBotName()} 🎤`);
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
				this.logger.success(`Registered Command: ${command.data.name} ⚡`);
			});
		}
	};

	bootstrap(token: string, clientId: string, guildId: string): void {
		const rest = new REST({ version: '9' }).setToken(token);
		const promises = [this.registerBots(), this.registerCommands(), this.registerVoiceBots()];

		this.logger.info('🚀 Starting Starbunk initialization...');
		Promise.all(promises).then();

		this.on(Events.MessageCreate, async (message: Message) => {
			this.logger.debug(`Received message: ${message.content.substring(0, 50)}...`);
			this.handleMessage(message);
		});

		this.on(Events.MessageUpdate, async (_oldMessage, newMessage) => {
			const message = await newMessage.fetch();
			this.logger.debug(`Message updated: ${message.content.substring(0, 50)}...`);
			this.handleMessage(message);
		});

		this.logger.info('🎤 Registering voice event handlers...');
		this.on(Events.VoiceStateUpdate, async (oldState, newState) => {
			this.logger.debug('Voice state update detected');
			this.handleVoiceEvent(oldState, newState);
		});

		this.logger.info('⚡ Registering slash commands...');
		rest.put(Routes.applicationGuildCommands(clientId, guildId), {
			body: this.commands.map((command) => command.data),
		});

		this.logger.info('👂 Listening for commands...');
		this.on(Events.InteractionCreate, async (interaction) => {
			if (!interaction.isCommand()) return;
			const command = this.commands.get(interaction.commandName);
			if (!command) {
				this.logger.warn(`Unknown command received: ${interaction.commandName}`);
				return;
			}
			this.logger.debug(`Executing command: ${interaction.commandName}`);
			command.execute(interaction);
		});
	}
}

export const getStarbunkClient = (base: Base): StarbunkClient => {
	return base.client as StarbunkClient;
};
