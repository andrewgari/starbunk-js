import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction } from 'discord.js';
import { logger } from '@starbunk/shared';
import { container, ServiceId } from '../utils';
import { sendErrorResponse, sendSuccessResponse } from '../utils/discord-utils';
import { DJCovaService } from '../services/dj-cova-service';

const commandBuilder = new SlashCommandBuilder().setName('stop').setDescription('Stop playing and leave channel');

export default {
	data: commandBuilder.toJSON(),
	async execute(interaction: ChatInputCommandInteraction) {
		try {
			// Get service from container
			const service = container.get<DJCovaService>(ServiceId.DJCovaService);
			if (!service) {
				await sendErrorResponse(interaction, 'Music service is not available.');
				return;
			}

			// Service handles the logic
			service.stop(interaction);

			await sendSuccessResponse(interaction, 'Music stopped and disconnected!');
			logger.info('Music stopped via stop command');
		} catch (error) {
			logger.error('Error executing stop command:', error);
			await sendErrorResponse(interaction, 'An error occurred while stopping the music.');
		}
	},
};
