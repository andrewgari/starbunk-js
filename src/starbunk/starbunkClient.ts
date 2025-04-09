import { PlayerSubscription } from '@discordjs/voice';
import {
	CommandInteraction,
	Events,
	GatewayIntentBits,
	IntentsBitField,
	Interaction,
	Message,
	VoiceState,
} from 'discord.js';
import DiscordClient from '../discord/discordClient';
import { setStarbunkClient } from '@/discord/getStarbunkClient';
import { bootstrapApplication } from '@/services/bootstrap';
import { logger } from '@/services/logger';

import { BotRegistry } from './bots/botRegistry';
import ReplyBot from './bots/replyBot';
import { CommandHandler } from './commandHandler';
import { DJCova } from './djCova';

export default class StarbunkClient extends DiscordClient {
	public activeSubscription: PlayerSubscription | null = null;
	private readonly commandHandler: CommandHandler;
	private hasInitialized = false;
	private musicPlayer: DJCova | null = null;

	constructor() {
		const intents = new IntentsBitField();
		intents.add(
			GatewayIntentBits.Guilds,
			GatewayIntentBits.GuildMessages,
			GatewayIntentBits.GuildVoiceStates,
			GatewayIntentBits.MessageContent,
			GatewayIntentBits.GuildMembers,
			GatewayIntentBits.GuildWebhooks,
		);

		super({ intents });

		// Set the global instance
		setStarbunkClient(this);

		this.commandHandler = new CommandHandler();

		// Set up event handlers
		this.on(Events.InteractionCreate, this.handleInteraction.bind(this));
		this.on(Events.VoiceStateUpdate, this.handleVoiceStateUpdate.bind(this));
		this.on(Events.Error, this.handleError.bind(this));
		this.on(Events.Warn, this.handleWarning.bind(this));
		this.on(Events.MessageCreate, this.handleMessage.bind(this));

		// Handle ready event
		this.once(Events.ClientReady, () => {
			logger.info('Starbunk bot is ready');
			this.hasInitialized = true;
		});
	}

	public getMusicPlayer(): DJCova {
		if (!this.musicPlayer) {
			this.musicPlayer = new DJCova();
		}
		return this.musicPlayer;
	}

	public async init(): Promise<void> {
		logger.info('Initializing StarbunkClient');
		try {
			// First bootstrap application services
			logger.info('Bootstrapping application services');
			await bootstrapApplication(this);
			logger.info('Application services bootstrapped successfully');

			// Then load all bots
			await this.loadBots();

			// Finally register commands
			await this.commandHandler.registerCommands();

			logger.info('StarbunkClient initialization complete');
		} catch (error) {
			logger.error('Error during initialization:', error instanceof Error ? error : new Error(String(error)));
			throw error;
		}
	}

	public async registerCommands(): Promise<void> {
		try {
			logger.info('Registering commands...');
			await this.commandHandler.registerCommands();
			logger.info('Commands registered successfully');
		} catch (error) {
			logger.error('Error registering commands:', error instanceof Error ? error : new Error(String(error)));
			throw error;
		}
	}

	public async waitForReady(): Promise<void> {
		if (!this.hasInitialized) {
			logger.info('Waiting for client to be ready...');
			await new Promise<void>((resolve, reject) => {
				const timeout = setTimeout(() => {
					reject(new Error('Timed out waiting for client to be ready'));
				}, 30000); // 30 second timeout

				this.once(Events.ClientReady, () => {
					clearTimeout(timeout);
					resolve();
				});
			});
		}
	}

	public override async destroy(): Promise<void> {
		try {
			// Call parent destroy
			await super.destroy();
		} catch (error) {
			logger.error('Error during client destroy:', error instanceof Error ? error : new Error(String(error)));
			throw error;
		}
	}

	private async handleInteraction(interaction: Interaction): Promise<void> {
		if (!interaction.isCommand()) return;

		try {
			await this.commandHandler.handleInteraction(interaction);
		} catch (error) {
			logger.error('Error handling interaction:', error instanceof Error ? error : new Error(String(error)));
		}
	}

	private handleVoiceStateUpdate(_oldState: VoiceState, _newState: VoiceState): void {
		// Voice state updates are handled by the music player
	}

	private handleError(error: Error): void {
		logger.error('Client error:', error);
	}

	private handleWarning(warning: string): void {
		logger.warn('Client warning:', warning);
	}

	private async loadBots(): Promise<void> {
		logger.info('Loading bots...');
		try {
			// Initialize personality service first
			const { getPersonalityService } = await import('../services/personalityService');
			const personalityService = getPersonalityService();

			try {
				// Try to load NPY file first, then JSON as fallback
				const npyEmbedding = await personalityService.loadPersonalityEmbedding('personality.npy');
				if (!npyEmbedding) {
					logger.info('NPY personality embedding not found, trying JSON format...');
					const jsonEmbedding = await personalityService.loadPersonalityEmbedding('personality.json');
					if (!jsonEmbedding) {
						logger.warn('No personality embedding files found. Using default behavior.');
					} else {
						logger.info('JSON personality embedding loaded successfully');
					}
				} else {
					logger.info('NPY personality embedding loaded successfully');
				}
			} catch (error) {
				logger.warn('Error loading personality embeddings, using default behavior');
			}

			logger.info('Personality service initialized successfully');

			// Load reply bots
			const { loadReplyBots } = await import('./bots/reply-loader');
			const replyBots = await loadReplyBots();

			// Log summary of loaded reply bots
			if (replyBots.length > 0) {
				logger.info(`📊 Successfully loaded ${replyBots.length} reply bots`);
				logger.info('📋 Reply bots summary:');
				replyBots.forEach((bot) => {
					logger.info(`   - ${bot.defaultBotName}`);
				});
			} else {
				logger.warn('⚠️ No reply bots were loaded');
			}

			// Load voice bots
			const { loadVoiceBots } = await import('./bots/voice-loader');
			const voiceBots = await loadVoiceBots();

			// Log summary of loaded voice bots
			if (voiceBots.length > 0) {
				logger.info(`📊 Successfully loaded ${voiceBots.length} voice bots`);
				logger.info('📋 Voice bots summary:');
				voiceBots.forEach((bot) => {
					logger.info(`   - ${bot.name}`);
				});
			} else {
				logger.warn('⚠️ No voice bots were loaded');
			}
		} catch (error) {
			logger.error('Error loading bots:', error instanceof Error ? error : new Error(String(error)));
			throw error;
		}
	}

	private async handleMessage(message: Message): Promise<void> {
		try {
			// Get all enabled reply bots from the registry
			const registry = BotRegistry.getInstance();
			const replyBots = Array.from(registry['replyBots'].values()) as ReplyBot[];

			// Create an array of promises for each enabled bot's message handling
			const processingPromises = replyBots
				.filter((bot) => registry.isBotEnabled(bot.defaultBotName))
				.map((bot) => {
					// Wrap the call in an async IIFE to handle potential errors individually
					return (async () => {
						try {
							await bot.handleMessage(message);
						} catch (error) {
							logger.error(
								`Error in bot ${bot.defaultBotName} while handling message:`,
								error instanceof Error ? error : new Error(String(error)),
							);
							// We log the error but don't re-throw, allowing Promise.allSettled to continue
						}
					})();
				});

			// Wait for all bot processing to settle (complete or error out)
			await Promise.allSettled(processingPromises);
		} catch (error) {
			// Catch errors related to getting the registry or bots list
			logger.error(
				'Error preparing to handle message:',
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}
}

export function getStarbunkClient(interaction: CommandInteraction): StarbunkClient {
	return interaction.client as StarbunkClient;
}
