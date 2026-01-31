import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction } from 'discord.js';
import { sendErrorResponse, sendSuccessResponse } from '../utils/discord-utils';
import { logger } from '../observability/logger';
import { getDJCovaService } from '@/core/djcova-factory';

const commandBuilder = new SlashCommandBuilder()
  .setName('stop')
  .setDescription('Stop playing and leave channel');

export default {
  data: commandBuilder.toJSON(),
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      if (!interaction.guild?.id) {
        await sendErrorResponse(interaction, 'This command can only be used in a server.');
        return;
      }

      // Get per-guild DJCovaService instance
      const service = getDJCovaService(interaction.guild.id);

      // Service handles the logic
      service.stop(interaction);

      await sendSuccessResponse(interaction, 'Music stopped and disconnected!');
      logger.info('Music stopped via stop command');
    } catch (error) {
      logger
        .withError(error instanceof Error ? error : new Error(String(error)))
        .error('Error executing stop command');
      await sendErrorResponse(interaction, 'An error occurred while stopping the music.');
    }
  },
};
