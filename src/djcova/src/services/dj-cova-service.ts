import { ChatInputCommandInteraction } from 'discord.js';
import { logger } from '@starbunk/shared';
import { DJCova } from '../core/dj-cova';
import {
	validateVoiceChannelAccess,
	createVoiceConnection,
	subscribePlayerToConnection,
	disconnectVoiceConnection,
} from '../utils/voice-utils';

/**
 * DJCovaService - Business logic layer
 * Handles validation, orchestration, and coordinates between commands and DJCova
 */
export class DJCovaService {
	private djCova: DJCova;

	constructor(djCova: DJCova) {
		this.djCova = djCova;
	}

	/**
	 * Play a YouTube URL in a voice channel
	 */
	async play(interaction: ChatInputCommandInteraction, url: string): Promise<void> {
		// Validate voice channel access
		const validation = validateVoiceChannelAccess(interaction);
		if (!validation.isValid) {
			throw new Error(validation.errorMessage || 'Voice channel validation failed');
		}

		const { voiceChannel } = validation;

		// Validate YouTube URL
		if (!this.isValidYouTubeUrl(url)) {
			throw new Error('Please provide a valid YouTube URL (youtube.com or youtu.be)');
		}

		// Create voice connection
		const connection = createVoiceConnection(voiceChannel!, voiceChannel!.guild.voiceAdapterCreator);

		// Subscribe player to connection
		const subscription = subscribePlayerToConnection(connection, this.djCova.getPlayer());
		if (!subscription) {
			throw new Error('Failed to connect audio player to voice channel');
		}

		// Initialize idle management with notification callback
		const notificationCallback = async (message: string) => {
			try {
				await interaction.followUp({ content: message, ephemeral: false });
			} catch (error) {
				logger.error('Failed to send auto-disconnect notification:', error);
			}
		};

		this.djCova.initializeIdleManagement(interaction.guild!.id, interaction.channelId, notificationCallback);

		// Start playback
		await this.djCova.play(url);
	}

	/**
	 * Stop playback and disconnect
	 */
	stop(interaction: ChatInputCommandInteraction): void {
		this.djCova.stop();

		if (interaction.guild?.id) {
			disconnectVoiceConnection(interaction.guild.id);
		}
	}

	/**
	 * Set volume
	 */
	setVolume(volume: number): void {
		if (volume < 1 || volume > 100) {
			throw new Error('Volume must be between 1 and 100');
		}

		this.djCova.setVolume(volume);
	}

	/**
	 * Get current volume
	 */
	getVolume(): number {
		return this.djCova.getVolume();
	}

	/**
	 * Validate YouTube URL
	 */
	private isValidYouTubeUrl(url: string): boolean {
		return (
			url.includes('youtube.com/watch?v=') || url.includes('youtu.be/') || url.includes('youtube.com/shorts/')
		);
	}
}

