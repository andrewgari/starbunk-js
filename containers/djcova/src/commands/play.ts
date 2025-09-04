import { AudioPlayerStatus } from '@discordjs/voice';
import { Attachment, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Readable } from 'stream';
import {
	logger,
	sendErrorResponse,
	sendSuccessResponse,
	deferInteractionReply,
	container,
	ServiceId,
} from '@starbunk/shared';
import { validateVoiceChannelAccess, createVoiceConnection, subscribePlayerToConnection } from '../utils/voiceUtils';
import { DJCova } from '../djCova';

const commandBuilder = new SlashCommandBuilder()
	.setName('play')
	.setDescription('Play a YouTube link or audio file in voice chat')
	.addStringOption((option) => option.setName('song').setDescription('YouTube video URL').setRequired(false))
	.addAttachmentOption((option) => option.setName('file').setDescription('Audio file (.mp3, .wav, etc.)'));

export default {
	data: commandBuilder.toJSON(),
	async execute(interaction: ChatInputCommandInteraction) {
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
			const sourceName = attachment ? ((attachment as Attachment).name ?? 'attachment') : url!;
			logger.info(`🎵 Attempting to play: ${sourceName}`);
			await deferInteractionReply(interaction);

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

			// Set up audio player event handlers
			musicPlayer.on(AudioPlayerStatus.Playing, () => {
				logger.info('🎶 Audio playback started');
			});

			musicPlayer.on(AudioPlayerStatus.Idle, () => {
				logger.info('⏹️ Audio playback ended');
			});

			// Resolve audio source
			let source: string | Readable;
			if (attachment) {
				const response = await fetch(attachment.url);
				const body = response.body;
				if (!body) {
					await sendErrorResponse(interaction, 'Failed to retrieve the provided audio file.');
					return;
				}
				// Convert the web ReadableStream from fetch() into a Node.js Readable
				const webStream = body as unknown as ReadableStream<Uint8Array>;
				source = Readable.fromWeb(webStream);
			} else {
				source = url!;
			}

			// Start playing the audio
			await musicPlayer.start(source);

			// Subscribe player to voice connection
			const subscription = subscribePlayerToConnection(connection, musicPlayer.getPlayer());
			if (!subscription) {
				await sendErrorResponse(interaction, 'Failed to connect audio player to voice channel.');
				return;
			}

			logger.info('Successfully subscribed to voice connection');
			await sendSuccessResponse(interaction, `🎶 Now playing: ${sourceName}`);
		} catch (error) {
			logger.error('Error executing play command', error instanceof Error ? error : new Error(String(error)));
			await sendErrorResponse(interaction, 'An error occurred while trying to play the music.');
		}
	},
};
