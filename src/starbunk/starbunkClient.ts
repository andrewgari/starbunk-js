import { PlayerSubscription } from '@discordjs/voice';
import { Base, ClientOptions, Collection, CommandInteraction, Events, Interaction, Message, REST, Routes, VoiceState } from 'discord.js';
import { readdirSync } from 'fs';
import { Command } from '../discord/command';
import DiscordClient from '../discord/discordClient';
import { Logger } from '../services/logger';
import ReplyBot from './bots/replyBot';
import VoiceBot from './bots/voiceBot';
import { DJCova } from './dJCova';

// Extend ReplyBot interface to include getBotName method
interface ReplyBotWithName extends ReplyBot {
	getBotName(): string;
}

interface StarbunkConfig extends ClientOptions {
	logger?: typeof Logger;
}

export default class StarbunkClient extends DiscordClient {
	private readonly logger: typeof Logger;
	bots: Collection<string, ReplyBotWithName> = new Collection();
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
		this.bots.forEach((bot: ReplyBotWithName) => {
			try {
				bot.handleMessage(message);
			} catch (error) {
				this.logger.error(`Error in bot ${bot.getBotName()}:`, error as Error);
			}
		});
	};

	handleVoiceEvent = (oldState: VoiceState, newState: VoiceState): void => {
		this.voiceBots.forEach((bot: VoiceBot) => {
			try {
				bot.handleEvent(oldState, newState);
			} catch (error) {
				this.logger.error(`Error in voice bot ${bot.getBotName()}:`, error as Error);
			}
		});
	};

	registerBots = async (): Promise<void> => {
		try {
			const botFiles = readdirSync('./src/starbunk/bots/reply-bots');
			this.logger.info(`Found ${botFiles.length} reply bots to register`);

			for (const file of botFiles) {
				try {
					const fileName = file.replace('.ts', '');
					const botModule = await import(`./bots/reply-bots/${fileName}`);

					if (!botModule?.default) {
						this.logger.warn(`No default export in bot file: ${fileName}`);
						continue;
					}

					const bot = new botModule.default(this) as ReplyBotWithName;

					if (!bot || !bot.getBotName()) {
						this.logger.warn(`Invalid bot in file: ${fileName}`);
						continue;
					}

					if (this.bots.has(bot.getBotName())) {
						this.logger.warn(`Duplicate bot name: ${bot.getBotName()}`);
						continue;
					}

					this.bots.set(bot.getBotName(), bot);
					this.logger.success(`Registered Bot: ${bot.getBotName()} 🤖`);
				} catch (error) {
					this.logger.error(`Error registering bot from file ${file}:`, error as Error);
				}
			}
		} catch (error) {
			this.logger.error('Error registering bots:', error as Error);
		}
	};

	registerVoiceBots = async (): Promise<void> => {
		try {
			const botFiles = readdirSync('./src/starbunk/bots/voice-bots');
			this.logger.info(`Found ${botFiles.length} voice bots to register`);

			for (const file of botFiles) {
				try {
					const fileName = file.replace('.ts', '');
					const botModule = await import(`./bots/voice-bots/${fileName}`);

					if (!botModule?.default) {
						this.logger.warn(`No default export in voice bot file: ${fileName}`);
						continue;
					}

					const bot = new botModule.default(this) as VoiceBot;

					if (!bot || !bot.getBotName()) {
						this.logger.warn(`Invalid voice bot in file: ${fileName}`);
						continue;
					}

					if (this.voiceBots.has(bot.getBotName())) {
						this.logger.warn(`Duplicate voice bot name: ${bot.getBotName()}`);
						continue;
					}

					this.voiceBots.set(bot.getBotName(), bot);
					this.logger.success(`Registered Voice Bot: ${bot.getBotName()} 🎤`);
				} catch (error) {
					this.logger.error(`Error registering voice bot from file ${file}:`, error as Error);
				}
			}
		} catch (error) {
			this.logger.error('Error registering voice bots:', error as Error);
		}
	};

	registerCommands = async (): Promise<void> => {
		try {
			const commandFiles = readdirSync('./src/starbunk/commands/');
			this.logger.info(`Found ${commandFiles.length} commands to register`);

			for (const file of commandFiles) {
				try {
					const fileName = file.replace('.ts', '');
					const commandModule = await import(`./commands/${fileName}`);
					const command = commandModule.default;

					if (!command || !command?.data?.name) {
						this.logger.warn(`Invalid command in file: ${fileName}`);
						continue;
					}

					if (this.commands.has(command.data.name)) {
						this.logger.warn(`Duplicate command name: ${command.data.name}`);
						continue;
					}

					this.commands.set(command.data.name, command);
					this.logger.success(`Registered Command: ${command.data.name} ⚡`);
				} catch (error) {
					this.logger.error(`Error registering command from file ${file}:`, error as Error);
				}
			}
		} catch (error) {
			this.logger.error('Error registering commands:', error as Error);
		}
	};

	bootstrap(token: string, clientId: string, guildId: string): void {
		try {
			const rest = new REST({ version: '9' }).setToken(token);
			const promises = [this.registerBots(), this.registerCommands(), this.registerVoiceBots()];

			this.logger.info('🚀 Starting Starbunk initialization...');

			Promise.all(promises)
				.then(() => {
					this.logger.success('✅ All modules registered successfully');
				})
				.catch((error) => {
					this.logger.error('Error during initialization:', error as Error);
				});

			this.on(Events.MessageCreate, async (message: Message) => {
				try {
					this.logger.debug(`Received message: ${message.content.substring(0, 50)}...`);
					this.handleMessage(message);
				} catch (error) {
					this.logger.error('Error handling message:', error as Error);
				}
			});

			this.on(Events.MessageUpdate, async (_oldMessage, newMessage) => {
				try {
					const message = await newMessage.fetch();
					this.logger.debug(`Message updated: ${message.content.substring(0, 50)}...`);
					this.handleMessage(message);
				} catch (error) {
					this.logger.error('Error handling updated message:', error as Error);
				}
			});

			this.logger.info('🎤 Registering voice event handlers...');
			this.on(Events.VoiceStateUpdate, async (oldState, newState) => {
				try {
					this.logger.debug('Voice state update detected');
					this.handleVoiceEvent(oldState, newState);
				} catch (error) {
					this.logger.error('Error handling voice state update:', error as Error);
				}
			});

			this.logger.info('⚡ Registering slash commands...');
			rest.put(Routes.applicationGuildCommands(clientId, guildId), {
				body: this.commands.map((command) => command.data),
			})
				.then(() => {
					this.logger.success('✅ Slash commands registered successfully');
				})
				.catch((error) => {
					this.logger.error('Error registering slash commands:', error as Error);
				});

			this.logger.info('👂 Listening for commands...');
			this.on(Events.InteractionCreate, async (interaction: Interaction) => {
				try {
					if (!interaction.isCommand()) return;

					const commandName = interaction.commandName;
					const command = this.commands.get(commandName);

					if (!command) {
						this.logger.warn(`Unknown command received: ${commandName}`);
						return;
					}

					this.logger.debug(`Executing command: ${commandName}`);
					await command.execute(interaction as CommandInteraction);
				} catch (error) {
					this.logger.error(`Error executing command:`, error as Error);

					// Try to respond to the user if possible
					if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
						await interaction.reply({
							content: 'An error occurred while executing this command.',
							ephemeral: true
						}).catch((replyError) => {
							this.logger.error('Failed to send error response:', replyError as Error);
						});
					}
				}
			});
		} catch (error) {
			this.logger.error('Fatal error during bootstrap:', error as Error);
		}
	}
}

export const getStarbunkClient = (base: Base): StarbunkClient => {
	try {
		return base.client as StarbunkClient;
	} catch (error) {
		Logger.error('Error getting StarbunkClient:', error as Error);
		throw new Error('Failed to get StarbunkClient');
	}
};
