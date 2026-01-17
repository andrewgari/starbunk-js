import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction } from 'discord.js';
import { logger } from '@starbunk/shared';
import { container, ServiceId } from '../utils';
import { sendErrorResponse, sendSuccessResponse } from '../utils/discord-utils';
import { DJCova } from '../dj-cova';

const commandBuilder = new SlashCommandBuilder()
	.setName('volume')
	.setDescription('It makes the noises go up and down')
	.addIntegerOption((option) => option.setName('noise').setDescription('set player volume %').setRequired(true));

export default {
	data: commandBuilder.toJSON(),
	async execute(interaction: ChatInputCommandInteraction) {
		try {
			// Get volume from the 'noise' option (as defined in the command builder)
			const vol = interaction.options.getInteger('noise');

			if (!vol || vol < 1 || vol > 100) {
				await sendErrorResponse(interaction, 'Volume must be between 1 and 100!');
				return;
			}

			// Get music player from container
			const musicPlayer = container.get<DJCova>(ServiceId.MusicPlayer);

			if (!musicPlayer) {
				await sendErrorResponse(interaction, 'Music player is not available.');
				return;
			}

			// Set the volume (no need to divide by 10, DJCova handles percentage internally)
			musicPlayer.changeVolume(vol);

			await sendSuccessResponse(interaction, `🔊 Volume set to ${vol}%!`);
			logger.info(`Volume changed to ${vol}% via volume command`);
		} catch (error) {
			logger.error('Error executing volume command:', error instanceof Error ? error : new Error(String(error)));
			await sendErrorResponse(interaction, 'An error occurred while changing the volume.');
		}
	},
};
