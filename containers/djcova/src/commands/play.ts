import { AudioPlayerStatus } from '@discordjs/voice';
import { CommandInteraction, SlashCommandBuilder } from 'discord.js';
import {
	logger,
	sendErrorResponse,
	sendSuccessResponse,
	deferInteractionReply,
	container,
	ServiceId
} from '@starbunk/shared';
import {
	validateVoiceChannelAccess,
	createVoiceConnection,
	subscribePlayerToConnection
} from '../utils/voiceUtils';
import { DJCova } from '../djCova';

const commandBuilder = new SlashCommandBuilder()
	.setName('play')
	.setDescription('Play a YouTube link in voice chat')
	.addStringOption((option) => option.setName('song').setDescription('YouTube video URL').setRequired(true));

export default {
	data: commandBuilder.toJSON(),
	async execute(interaction: CommandInteraction) {
		const url = interaction.options.get('song')?.value as string;

		if (!url) {
			logger.warn('Play command executed without URL');
			await sendErrorResponse(interaction, 'Please provide a valid YouTube link!');
			return;
		}

		// Validate voice channel access
		const voiceValidation = validateVoiceChannelAccess(interaction);
		if (!voiceValidation.isValid) {
			await sendErrorResponse(interaction, voiceValidation.errorMessage!);
			return;
		}

		const { member, voiceChannel } = voiceValidation;

		try {
			logger.info(`🎵 Attempting to play: ${url}`);
			await deferInteractionReply(interaction);

			// Create voice connection
			const connection = createVoiceConnection(
				voiceChannel!,
				voiceChannel!.guild.voiceAdapterCreator
			);

			// Get music player from container
			const musicPlayer = container.get<DJCova>(ServiceId.MusicPlayer);

			// Set up audio player event handlers
			musicPlayer.on(AudioPlayerStatus.Playing, () => {
				logger.info('🎶 Audio playback started');
			});

			musicPlayer.on(AudioPlayerStatus.Idle, () => {
				logger.info('⏹️ Audio playback ended');
			});

			// Start playing the audio
			await musicPlayer.start(url);

			// Subscribe player to voice connection
			const subscription = subscribePlayerToConnection(connection, musicPlayer.getPlayer());
			if (!subscription) {
				await sendErrorResponse(interaction, 'Failed to connect audio player to voice channel.');
				return;
			}

			logger.info('Successfully subscribed to voice connection');
			await sendSuccessResponse(interaction, `🎶 Now playing: ${url}`);
		} catch (error) {
			logger.error('Error executing play command', error instanceof Error ? error : new Error(String(error)));
			await sendErrorResponse(interaction, 'An error occurred while trying to play the music.');
		}
	},
};
