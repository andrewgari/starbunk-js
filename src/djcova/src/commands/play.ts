import { SlashCommandBuilder } from '@discordjs/builders';
import type { ChatInputCommandInteraction } from 'discord.js';
import { container, ServiceId } from '../utils';
import { sendErrorResponse, sendSuccessResponse } from '../utils/discord-utils';
import { DJCovaService } from '../services/dj-cova-service';
import { logger } from '../observability/logger';

const commandBuilder = new SlashCommandBuilder()
	.setName('play')
	.setDescription('Play a YouTube URL in voice chat')
	.addStringOption((option) => option.setName('url').setDescription('YouTube video URL').setRequired(true));

export default {
	data: commandBuilder.toJSON(),
	async execute(interaction: ChatInputCommandInteraction) {
		// Defer immediately to avoid Discord's 3-second timeout
		try {
			if (!interaction.deferred && !interaction.replied) {
				await interaction.deferReply();
			}
		} catch (deferError) {
			logger.withError(deferError instanceof Error ? deferError : new Error(String(deferError)))
				.error('Failed to defer interaction');
			return;
		}

		const url = interaction.options.getString('url');
		if (!url) {
			await sendErrorResponse(interaction, 'Please provide a YouTube URL!');
			return;
		}

		try {
			// Get service from container
			const service = container.get<DJCovaService>(ServiceId.DJCovaService);
			if (!service) {
				await sendErrorResponse(interaction, 'Music service is not available.');
				return;
			}

			// Service handles all the business logic
			await service.play(interaction, url);

			await sendSuccessResponse(interaction, `🎶 Now playing!`);
		} catch (error) {
			logger.withError(error instanceof Error ? error : new Error(String(error)))
				.error('Error executing play command');

			const errorMessage =
				error instanceof Error ? error.message : 'An error occurred while trying to play the music.';

			await sendErrorResponse(interaction, errorMessage);
		}
	},
};
