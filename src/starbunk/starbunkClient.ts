import { PlayerSubscription } from '@discordjs/voice';
import { Base, Client, Collection, Events, GatewayIntentBits, Interaction, Message, VoiceState } from 'discord.js';
import { isDebugMode } from '../environment';
import { bootstrapApplication } from '../services/bootstrap';
import { logger } from '../services/logger';
import { BaseVoiceBot } from './bots/core/voice-bot-adapter';
import ReplyBot from './bots/replyBot';
import { CommandHandler } from './commandHandler';
import { DJCova } from './djCova';

export default class StarbunkClient extends Client {
	private bots: Collection<string, ReplyBot> = new Collection();
	private voiceBots: Collection<string, BaseVoiceBot> = new Collection();
	private readonly audioPlayer: DJCova;
	private readonly commandHandler: CommandHandler;
	public activeSubscription: PlayerSubscription | undefined;

	constructor() {
		super({
			intents: [
				GatewayIntentBits.Guilds,
				GatewayIntentBits.GuildMessages,
				GatewayIntentBits.MessageContent,
				GatewayIntentBits.GuildVoiceStates
			]
		});

		this.audioPlayer = new DJCova();
		this.commandHandler = new CommandHandler();

		this.once(Events.ClientReady, this.onReady.bind(this));
		this.on(Events.MessageCreate, this.handleMessage.bind(this));
		this.on(Events.InteractionCreate, this.handleInteraction.bind(this));
		this.on(Events.VoiceStateUpdate, this.handleVoiceStateUpdate.bind(this));

		this.on('error', (error: Error) => {
			logger.error('Discord client error:', error);
		});

		this.on('warn', (warning: string) => {
			logger.warn('Discord client warning:', warning);
		});

		this.on('debug', (info: string) => {
			logger.debug('Discord client debug:', info);
		});
	}

	public getMusicPlayer(): DJCova {
		return this.audioPlayer;
	}

	private onReady = async (): Promise<void> => {
		try {
			logger.info(`Logged in as ${this.user?.tag}`);
			logger.info('Client initialization complete');
		} catch (error) {
			logger.error('Error in ready event:', error instanceof Error ? error : new Error(String(error)));
		}
	};

	private async handleMessage(message: Message): Promise<void> {
		logger.debug(`Processing message "${message.content.substring(0, 100)}..." through ${this.bots.size} bots`);

		try {
			const promises = this.bots.map(async (bot) => {
				try {
					logger.debug(`Sending message to bot: ${bot.defaultBotName}`);
					await bot.auditMessage(message);
					logger.debug(`Bot ${bot.defaultBotName} finished processing message`);
				} catch (error) {
					logger.error(`Error in bot ${bot.defaultBotName} while processing message:`, error instanceof Error ? error : new Error(String(error)));
				}
			});

			await Promise.all(promises);
			logger.debug('All bots finished processing message');
		} catch (error) {
			logger.error('Error handling message across bots:', error instanceof Error ? error : new Error(String(error)));
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
					logger.error(`Error in bot ${bot.constructor.name} while processing voice state update:`, error instanceof Error ? error : new Error(String(error)));
				}
			});

			await Promise.all(promises);
			logger.debug('All voice bots finished processing voice state update');
		} catch (error) {
			logger.error('Error handling voice state update across bots:', error instanceof Error ? error : new Error(String(error)));
		}
	}

	private async handleInteraction(interaction: Interaction): Promise<void> {
		if (!interaction.isChatInputCommand()) return;

		try {
			await this.commandHandler.handleInteraction(interaction);
		} catch (error) {
			logger.error('Error handling interaction:', error instanceof Error ? error : new Error(String(error)));
		}
	}

	public override destroy(): Promise<void> {
		logger.info('Destroying StarbunkClient');
		try {
			// Call the parent destroy method from Client
			return super.destroy();
		} catch (error) {
			logger.error('Error destroying Discord client:', error instanceof Error ? error : new Error(String(error)));
			throw error;
		}
	}

	public async init(): Promise<void> {
		logger.info('Initializing StarbunkClient');
		try {
			// Bootstrap application services
			logger.info('Bootstrapping application services');
			try {
				await bootstrapApplication(this);
				logger.info('Application services bootstrapped successfully');
			} catch (error) {
				logger.error('Failed to bootstrap application services:', error instanceof Error ? error : new Error(String(error)));
				throw error;
			}

			// Load bots and commands
			await this.loadBots();

			// Register commands with Discord
			await this.commandHandler.registerCommands();

			logger.info('StarbunkClient initialized successfully');
		} catch (error) {
			logger.error('Failed to initialize StarbunkClient:', error instanceof Error ? error : new Error(String(error)));
			throw error;
		}
	}

	private async loadBots(): Promise<void> {
		logger.info('Loading bots...');
		try {
			// Check if we're in debug mode
			const isDebug = isDebugMode();

			// Debug more information about environment
			if (isDebug) {
				const isTsNode = process.argv[0].includes('ts-node') ||
					(process.env.npm_lifecycle_script && process.env.npm_lifecycle_script.includes('ts-node'));
				logger.debug(`Running with ts-node: ${isTsNode}`);
				logger.debug(`Loading bots with: NODE_ENV=${process.env.NODE_ENV}, ts-node=${isTsNode}, __dirname=${__dirname}`);
				logger.debug(`Command: ${process.argv.join(' ')}`);
				if (process.env.npm_lifecycle_script) {
					logger.debug(`npm script: ${process.env.npm_lifecycle_script}`);
				}
			}

			// Load strategy bots
			try {
				// Import the strategy bot loader
				// eslint-disable-next-line @typescript-eslint/no-var-requires
				const { loadStrategyBots } = require('./bots/strategy-loader');
				const strategyBots = await loadStrategyBots();

				// Add strategy bots to the collection
				strategyBots.forEach((bot: ReplyBot) => {
					if (bot && typeof bot.defaultBotName === 'string') {
						this.bots.set(bot.defaultBotName, bot);
						logger.debug(`Added strategy bot: ${bot.defaultBotName}`);
					}
				});

				// Show summary of all loaded strategy bots
				if (this.bots.size > 0) {
					logger.info(`📊 Successfully loaded ${this.bots.size} strategy bots`);
					logger.info('📋 Strategy bots summary:');
					this.bots.forEach((bot, name) => {
						logger.info(`   - ${name} (${bot.constructor.name})`);
					});
				} else {
					logger.warn('⚠️ No strategy bots were loaded');
				}
			} catch (error) {
				logger.error('Error loading strategy bots:', error instanceof Error ? error : new Error(String(error)));
			}

			// Load voice bots
			try {
				// Import the voice bot loader
				// eslint-disable-next-line @typescript-eslint/no-var-requires
				const { loadVoiceBots } = require('./bots/voice-loader');
				const voiceBots = await loadVoiceBots();

				// Add voice bots to the collection
				voiceBots.forEach((bot: BaseVoiceBot) => {
					if (bot && typeof bot.name === 'string') {
						this.voiceBots.set(bot.name, bot);
						logger.debug(`Added voice bot: ${bot.name}`);
					}
				});

				// Show summary of all loaded voice bots
				if (this.voiceBots.size > 0) {
					logger.info(`📊 Successfully loaded ${this.voiceBots.size} voice bots`);
					logger.info('📋 Voice bots summary:');
					this.voiceBots.forEach((bot, name) => {
						logger.info(`   - ${name} (${bot.constructor.name})`);
					});
				} else {
					logger.warn('⚠️ No voice bots were loaded');
				}
			} catch (error) {
				logger.error('Error loading voice bots:', error instanceof Error ? error : new Error(String(error)));
			}
		} catch (error) {
			logger.error('Error loading bots:', error instanceof Error ? error : new Error(String(error)));
		}
	}
}

export const getStarbunkClient = (base: Base): StarbunkClient => {
	return base.client as StarbunkClient;
};
