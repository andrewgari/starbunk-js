import { PlayerSubscription } from '@discordjs/voice';
import { Client, CommandInteraction, Events, GatewayIntentBits, Interaction, VoiceState } from 'discord.js';
import { bootstrapApplication } from '../services/bootstrap';
import { logger } from '../services/logger';
import { CommandHandler } from './commandHandler';
import { DJCova } from './djCova';

export default class StarbunkClient extends Client {
	private readonly commandHandler: CommandHandler;
	private hasInitialized = false;
	private musicPlayer: DJCova | null = null;
	public activeSubscription: PlayerSubscription | null = null;

	constructor() {
		super({
			intents: [
				GatewayIntentBits.Guilds,
				GatewayIntentBits.GuildMessages,
				GatewayIntentBits.GuildVoiceStates,
				GatewayIntentBits.MessageContent
			]
		});

		this.commandHandler = new CommandHandler();

		// Set up event handlers
		this.on(Events.InteractionCreate, this.handleInteraction.bind(this));
		this.on(Events.VoiceStateUpdate, this.handleVoiceStateUpdate.bind(this));
		this.on(Events.Error, this.handleError.bind(this));
		this.on(Events.Warn, this.handleWarning.bind(this));

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
			// Bootstrap application services
			logger.info('Bootstrapping application services');
			await bootstrapApplication(this);
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

	public override async destroy(): Promise<void> {
		try {
			// Call parent destroy
			await super.destroy();
		} catch (error) {
			logger.error('Error during client destroy:', error instanceof Error ? error : new Error(String(error)));
			throw error;
		}
	}
}

export function getStarbunkClient(interaction: CommandInteraction): StarbunkClient {
	return interaction.client as StarbunkClient;
}
