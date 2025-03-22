import { PlayerSubscription } from '@discordjs/voice';
import { Base, Client, Collection, Events, GatewayIntentBits, Interaction, Message, VoiceState } from 'discord.js';
import path, { join } from 'path';
import { logger } from '../services/logger';
import { loadBot, scanDirectory } from '../util/moduleLoader';
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

			// Check if we're running under ts-node
			const isTsNode = process.argv[0].includes('ts-node') ||
				(process.env.npm_lifecycle_script && process.env.npm_lifecycle_script.includes('ts-node'));
			logger.debug(`Running with ts-node: ${isTsNode}`);

			// We need to check both src and dist directories
			const srcPath = join(__dirname.replace('/dist/', '/src/'), 'bots', 'reply-bots');
			const distPath = join(__dirname, 'bots', 'reply-bots');

			// Try src directory first in development mode or when using ts-node
			const primaryPath = (isDev || isTsNode) ? srcPath : distPath;
			const primaryExt = (isDev || isTsNode) ? '.ts' : '.js';
			const backupPath = (isDev || isTsNode) ? distPath : srcPath;
			const backupExt = (isDev || isTsNode) ? '.js' : '.ts';

			logger.debug(`Primary directory: ${primaryPath} with extension ${primaryExt}`);
			logger.debug(`Backup directory: ${backupPath} with extension ${backupExt}`);

			// First try the primary path
			let botFiles = scanDirectory(primaryPath, primaryExt);

			// If no files found, try the backup path
			if (botFiles.length === 0) {
				logger.debug(`No files found in primary path, trying backup path: ${backupPath}`);
				botFiles = scanDirectory(backupPath, backupExt);
			}

			// Last resort: try both extensions in both directories
			if (botFiles.length === 0) {
				logger.debug(`Still no files found, trying all combinations`);
				botFiles = [
					...scanDirectory(primaryPath, '.ts'),
					...scanDirectory(primaryPath, '.js'),
					...scanDirectory(backupPath, '.ts'),
					...scanDirectory(backupPath, '.js')
				];
			}

			logger.info(`Found ${botFiles.length} bot files to load: ${botFiles.map(f => path.basename(f)).join(', ')}`);

			let successCount = 0;
			for (const botFile of botFiles) {
				try {
					logger.info(`Loading bot from file: ${botFile}`);
					const bot = await loadBot(botFile);

					if (bot) {
						logger.info(`✅ Bot loaded successfully: ${bot.defaultBotName} (${bot.constructor.name})`);
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

