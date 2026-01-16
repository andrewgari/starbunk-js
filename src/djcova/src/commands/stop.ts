import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction } from 'discord.js';
import { logger, container, ServiceId } from '@starbunk/shared';
import { sendErrorResponse, sendSuccessResponse } from '../utils/discord-utils';
import { disconnectVoiceConnection } from '../utils/voice-utils';
import { DJCova } from '../dj-cova';

const commandBuilder = new SlashCommandBuilder().setName('stop').setDescription('Stop playing and leave channel');

export default {
	data: commandBuilder.toJSON(),
	async execute(interaction: ChatInputCommandInteraction) {
		try {
			// Get music player from container
			const musicPlayer = container.get<DJCova>(ServiceId.MusicPlayer);

			// Manually disconnect (this will cancel idle timer and stop music)
			musicPlayer.disconnect();

			// Disconnect from voice channel
			if (interaction.guild?.id) {
				disconnectVoiceConnection(interaction.guild.id);
			}

			await sendSuccessResponse(interaction, 'Music stopped and disconnected from voice channel!');
			logger.info('Music stopped via stop command');
		} catch (error) {
			logger.error('Error executing stop command:', error instanceof Error ? error : new Error(String(error)));
			await sendErrorResponse(interaction, 'An error occurred while stopping the music.');
		}
	},
};
