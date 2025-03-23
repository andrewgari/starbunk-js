import { PlayerSubscription } from '@discordjs/voice';
import { Base, Client, Collection, Events, GatewayIntentBits, Interaction, Message, VoiceState } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { logger } from '../services/logger';
import { loadBot } from '../util/moduleLoader';
import ReplyBot from './bots/replyBot';
import { VoiceBot } from './bots/voiceBot';
import { CommandHandler } from './commandHandler';
import { DJCova } from './djCova';

export default class StarbunkClient extends Client {
	private bots: Collection<string, ReplyBot> = new Collection();
	private voiceBots: Collection<string, VoiceBot> = new Collection();
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

		// Import bootstrapApplication dynamically to avoid circular dependency
		try {
			const { bootstrapApplication } = require('../services/bootstrap');
			bootstrapApplication(this).then(() => {
				logger.info('Services bootstrapped successfully within StarbunkClient');
			}).catch((error: unknown) => {
				logger.error('Failed to bootstrap services within StarbunkClient:', error instanceof Error ? error : new Error(String(error)));
			});
		} catch (error: unknown) {
			logger.error('Error importing or executing bootstrapApplication:', error instanceof Error ? error : new Error(String(error)));
		}

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
		if (message.author.bot) return;

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
		// Feature flag to skip loading until module format issues are resolved
		const usePlaceholderBots = false;

		if (usePlaceholderBots) {
			logger.warn('Using placeholder bots due to module loading issues');
			logger.info(`Loaded 0 bots successfully`);
			return;
		}

		logger.info('Loading reply bots...');
		try {
			// Determine if we're in development mode
			const isDev = process.env.NODE_ENV === 'development';
			const isDebug = process.env.DEBUG === 'true';

			// Setting TS_NODE_DEV for path resolution in TypeScript modules
			if (isDev) {
				process.env.TS_NODE_DEV = 'true';
			}

			// Check if we're running under ts-node
			const isTsNode = process.argv[0].includes('ts-node') ||
				(process.env.npm_lifecycle_script && process.env.npm_lifecycle_script.includes('ts-node'));
			logger.debug(`Running with ts-node: ${isTsNode}`);

			// Debug more information about environment
			if (isDebug) {
				logger.debug(`Loading bots with: NODE_ENV=${process.env.NODE_ENV}, ts-node=${isTsNode}, __dirname=${__dirname}`);
				logger.debug(`Command: ${process.argv.join(' ')}`);
				if (process.env.npm_lifecycle_script) {
					logger.debug(`npm script: ${process.env.npm_lifecycle_script}`);
				}
			}

			// In dev mode, we want to use .ts files
			const devExtension = '.ts';
			const prodExtension = '.js';

			// Determine the file extension to use based on environment
			const fileExtension = (isDev || isTsNode) ? devExtension : prodExtension;

			// When running in development or using ts-node, we use the src directory path
			const botDir = path.resolve('./src/starbunk/bots/reply-bots');

			logger.debug(`Looking for bots in: ${botDir}`);
			logger.info(`Running in ${isDev ? 'development' : 'production'} mode, looking for ${fileExtension} files`);

			// Find all bot files using the direct path
			const botFiles = fs.readdirSync(botDir)
				.filter(file => file.endsWith(fileExtension) && !file.endsWith('.d.ts'))
				.map(file => path.join(botDir, file));

			logger.info(`Found ${botFiles.length} bot files to load: ${botFiles.map(f => path.basename(f)).join(', ')}`);

			let successCount = 0;
			for (const botFile of botFiles) {
				try {
					logger.info(`Loading bot from file: ${path.basename(botFile)}`);

					// Try direct require first which works better in our diagnostic script
					try {
						logger.info(`Attempting direct require for ${path.basename(botFile)}`);
						// eslint-disable-next-line @typescript-eslint/no-var-requires
						const BotClass = require(botFile.replace(/\.ts$/, '')).default;
						if (BotClass) {
							const bot = new BotClass();
							if (bot && typeof bot.handleMessage === 'function' && typeof bot.defaultBotName !== 'undefined') {
								logger.info(`✅ Bot loaded successfully: ${bot.defaultBotName} (${bot.constructor.name})`);
								this.bots.set(bot.defaultBotName, bot);
								successCount++;
								continue; // Skip to next bot file
							}
						} else {
							logger.warn(`⚠️ No default export found in ${path.basename(botFile)}`);
						}
					} catch (requireError: unknown) {
						const errorMessage = requireError instanceof Error
							? requireError.message
							: 'Unknown error';
						logger.warn(`⚠️ Direct require failed for ${path.basename(botFile)}: ${errorMessage}`);
						// Continue to try the loadBot utility
					}

					// Fall back to loadBot utility
					const bot = await loadBot(botFile);

					if (bot) {
						logger.info(`✅ Bot loaded successfully via loadBot: ${bot.defaultBotName} (${bot.constructor.name})`);
						this.bots.set(bot.defaultBotName, bot);
						successCount++;
					} else {
						logger.warn(`⚠️ No bot instance returned from: ${botFile}`);
					}
				} catch (error) {
					logger.error(`❌ Failed to load bot: ${botFile}`, error instanceof Error ? error : new Error(String(error)));
				}
			}

			logger.info(`📊 Successfully loaded ${successCount} out of ${botFiles.length} bots`);

			if (successCount > 0) {
				logger.info('📋 Loaded bots summary:');
				this.bots.forEach((bot, name) => {
					logger.info(`   - ${name} (${bot.constructor.name})`);
				});
			}
		} catch (error) {
			logger.error('Error loading bots:', error instanceof Error ? error : new Error(String(error)));
		}
	}
}

export const getStarbunkClient = (base: Base): StarbunkClient => {
	return base.client as StarbunkClient;
};

