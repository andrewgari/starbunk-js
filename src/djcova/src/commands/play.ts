import { SlashCommandBuilder } from '@discordjs/builders';
import type { ChatInputCommandInteraction } from 'discord.js';
import { sendErrorResponse, sendSuccessResponse } from '../utils/discord-utils';
import { logger } from '@/observability/logger';
import { getDJCovaService } from '@/core/djcova-factory';
import { getDJCovaMetrics } from '@/observability/djcova-metrics';
import { DJCovaErrorCode } from '@/errors';
import { logError } from '@starbunk/shared/errors';
import { SharedErrorCode } from '@starbunk/shared/errors';

const commandBuilder = new SlashCommandBuilder()
  .setName('play')
  .setDescription('Play a YouTube URL in voice chat')
  .addStringOption(option =>
    option.setName('url').setDescription('YouTube video URL').setRequired(true),
  );

export default {
  data: commandBuilder.toJSON(),
  async execute(interaction: ChatInputCommandInteraction) {
    logger.info('Play command received');
    logger.debug(`User: ${interaction.user?.tag}, Guild: ${interaction.guild?.id}`);

    // Defer immediately to avoid Discord's 3-second timeout
    try {
      if (!interaction.deferred && !interaction.replied) {
        logger.debug('Deferring reply...');
        await interaction.deferReply();
        logger.debug('✅ Reply deferred');
      }
    } catch (deferError) {
      logError(logger, SharedErrorCode.DISCORD_API_ERROR, 'Failed to defer interaction', {
        cause: deferError,
      });
      return;
    }

    const url = interaction.options.getString('url');
    logger.debug(`URL provided: ${url}`);

    if (!url) {
      logger.warn('No URL provided in play command');
      getDJCovaMetrics().trackPlayCommand(interaction.guild?.id ?? 'unknown', 'error');
      await sendErrorResponse(interaction, 'Please provide a YouTube URL!');
      return;
    }

    const guildId = interaction.guild?.id;

    if (!guildId) {
      logger.warn('Play command used outside of guild context');
      getDJCovaMetrics().trackPlayCommand('unknown', 'error');
      await sendErrorResponse(interaction, 'This command can only be used in a server.');
      return;
    }

    try {
      logger.debug(`Getting DJCova service for guild: ${guildId}`);
      const service = getDJCovaService(guildId);
      logger.debug('DJCova service retrieved, calling play method...');

      await service.play(interaction, url);
      logger.info('✅ Play command completed successfully');

      getDJCovaMetrics().trackPlayCommand(guildId, 'success');
      await sendSuccessResponse(interaction, `🎶 Now playing!`);
    } catch (error) {
      logError(logger, DJCovaErrorCode.DJCOVA_PLAY_COMMAND_FAILED, 'Play command failed', {
        cause: error,
        guild_id: guildId,
      });
      getDJCovaMetrics().trackPlayCommand(guildId, 'error');

      const errorMessage =
        error instanceof Error
          ? error.message
          : 'An error occurred while trying to play the music.';

      await sendErrorResponse(interaction, errorMessage);
    }
  },
};
