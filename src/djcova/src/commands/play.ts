import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction } from 'discord.js';

import { Readable } from 'stream';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';

import { logger } from '@starbunk/shared';
import { deferInteractionReply, container, ServiceId } from '../utils';
import { sendErrorResponse, sendSuccessResponse } from '../utils/discord-utils';
import { validateVoiceChannelAccess, createVoiceConnection, subscribePlayerToConnection } from '../utils/voice-utils';
import { DJCova } from '../dj-cova';

const commandBuilder = new SlashCommandBuilder()
	.setName('play')
	.setDescription('Play a YouTube link or audio file in voice chat')
	.addStringOption((option) => option.setName('song').setDescription('YouTube video URL').setRequired(false))
	.addAttachmentOption((option) => option.setName('file').setDescription('Audio file (.mp3, .wav, etc.)'));

export default {
	data: commandBuilder.toJSON(),
	async execute(interaction: ChatInputCommandInteraction) {
		// CRITICAL: Defer immediately to avoid Discord's 3-second timeout
		// This must be the first async operation
		try {
			await deferInteractionReply(interaction);
		} catch (deferError) {
			// If defer fails, the interaction is likely expired (>3s)
			// We cannot respond to this interaction anymore, so just log and return
			logger.error(
				'Failed to defer interaction - interaction likely expired:',
				deferError instanceof Error ? deferError : new Error(String(deferError)),
			);
			return;
		}

		const attachment = interaction.options.getAttachment('file');
		const url = interaction.options.getString('song');

		if (!attachment && !url) {
			logger.warn('Play command executed without URL or attachment');
			await sendErrorResponse(interaction, 'Please provide a valid YouTube link or audio file!');
			return;
		}

		// Validate voice channel access
		const voiceValidation = validateVoiceChannelAccess(interaction);
		if (!voiceValidation.isValid) {
			await sendErrorResponse(interaction, voiceValidation.errorMessage!);
			return;
		}

		const { voiceChannel } = voiceValidation;

		try {
			const sourceName = attachment ? attachment.name : url!;
			logger.info(`🎵 Attempting to play: ${sourceName}`);

			// Validate YouTube URL if provided
			if (url && !attachment) {
				const isValidYoutubeUrl =
					url.includes('youtube.com/watch?v=') ||
					url.includes('youtu.be/') ||
					url.includes('youtube.com/shorts/');
				if (!isValidYoutubeUrl) {
					await sendErrorResponse(
						interaction,
						'Please provide a valid YouTube URL (youtube.com or youtu.be)',
					);
					return;
				}
			}

			// Create voice connection
			const connection = createVoiceConnection(voiceChannel!, voiceChannel!.guild.voiceAdapterCreator);

			// Get music player from container
			const musicPlayer = container.get<DJCova>(ServiceId.MusicPlayer);

			// Initialize idle management with notification callback
			const notificationCallback = async (message: string) => {
				try {
					await interaction.followUp({ content: message, ephemeral: false });
				} catch (error) {
					logger.error(
						'Failed to send auto-disconnect notification:',
						error instanceof Error ? error : new Error(String(error)),
					);
				}
			};

			musicPlayer.initializeIdleManagement(interaction.guild!.id, interaction.channelId, notificationCallback);

			// NOTE: Audio player event handlers are set up in DJCova constructor
			// Don't register them here to avoid duplicate listeners/memory leaks

			// CRITICAL: Subscribe player to voice connection BEFORE starting playback
			// This ensures the audio has somewhere to go before we start playing
			const subscription = subscribePlayerToConnection(connection, musicPlayer.getPlayer());
			if (!subscription) {
				await sendErrorResponse(interaction, 'Failed to connect audio player to voice channel.');
				return;
			}
			logger.info('Successfully subscribed to voice connection');

			// Resolve audio source
			let source: string | Readable;
			if (attachment) {
				logger.debug(`Fetching audio file from attachment: ${attachment.name}`);
				const response = await fetch(attachment.url);
				if (!response.body) {
					await sendErrorResponse(interaction, 'Failed to retrieve the provided audio file.');
					return;
				}
				source = Readable.fromWeb(response.body as WebReadableStream);
			} else {
				source = url!;
			}

			// Start playing the audio (now that we're subscribed)
			await musicPlayer.start(source);

			await sendSuccessResponse(interaction, `🎶 Now playing: ${sourceName}`);
		} catch (error) {
			logger.error('Error executing play command', error instanceof Error ? error : new Error(String(error)));

			// Provide more specific error messages for common issues
			let errorMessage = 'An error occurred while trying to play the music.';

			if (error instanceof Error) {
				if (error.message.includes('Status code: 410')) {
					errorMessage = 'This YouTube video is unavailable or has been removed.';
				} else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
					errorMessage = 'Network error: Unable to connect to YouTube. Please try again later.';
				} else if (error.message.includes('Video unavailable')) {
					errorMessage = 'This YouTube video is unavailable or restricted.';
				} else if (error.message.includes('Sign in to confirm your age')) {
					errorMessage = 'This video is age-restricted and cannot be played.';
				} else if (error.message.includes('ffmpeg')) {
					errorMessage = 'Audio processing error: FFmpeg is not properly configured.';
				}
			}

			await sendErrorResponse(interaction, errorMessage);
		}
	},
};
