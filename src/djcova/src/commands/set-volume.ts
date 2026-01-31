import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction } from 'discord.js';
import { sendErrorResponse, sendSuccessResponse } from '../utils/discord-utils';
import { logger } from '../observability/logger';
import { getDJCovaService } from '@/core/djcova-factory';

const commandBuilder = new SlashCommandBuilder()
  .setName('volume')
  .setDescription('Set playback volume')
  .addIntegerOption(option =>
    option.setName('level').setDescription('Volume level (1-100)').setRequired(true),
  );

export default {
  data: commandBuilder.toJSON(),
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      // Since 'level' is required, getInteger with true will never return null
      const vol = interaction.options.getInteger('level', true);

      if (!interaction.guild?.id) {
        await sendErrorResponse(interaction, 'This command can only be used in a server.');
        return;
      }

      // Get per-guild DJCovaService instance
      const service = getDJCovaService(interaction.guild.id);

      // Service handles validation and logic
      service.setVolume(vol);

      await sendSuccessResponse(interaction, `Volume set to ${vol}%`);
      logger.info(`Volume changed to ${vol}%`);
    } catch (error) {
      logger
        .withError(error instanceof Error ? error : new Error(String(error)))
        .error('Error executing volume command');

      const errorMessage =
        error instanceof Error ? error.message : 'An error occurred while changing the volume.';

      await sendErrorResponse(interaction, errorMessage);
    }
  },
};
