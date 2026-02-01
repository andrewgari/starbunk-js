import { SlashCommandBuilder } from '@discordjs/builders';
import type { ChatInputCommandInteraction } from 'discord.js';
import { sendErrorResponse, sendSuccessResponse } from '../utils/discord-utils';
import { logger } from '@/observability/logger';
import { getDJCovaService } from '@/core/djcova-factory';

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
      logger
        .withError(deferError instanceof Error ? deferError : new Error(String(deferError)))
        .error('Failed to defer interaction');
      return;
    }

    const url = interaction.options.getString('url');
    logger.debug(`URL provided: ${url}`);

    if (!url) {
      logger.warn('No URL provided in play command');
      await sendErrorResponse(interaction, 'Please provide a YouTube URL!');
      return;
    }

    try {
      // Get or create per-guild DJCovaService instance
      if (!interaction.guild?.id) {
        logger.warn('Play command used outside of guild context');
        await sendErrorResponse(interaction, 'This command can only be used in a server.');
        return;
      }

      logger.debug(`Getting DJCova service for guild: ${interaction.guild.id}`);
      const service = getDJCovaService(interaction.guild.id);
      logger.debug('DJCova service retrieved, calling play method...');

      await service.play(interaction, url);
      logger.info('✅ Play command completed successfully');

      await sendSuccessResponse(interaction, `🎶 Now playing!`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger
        .withError(err)
        .withMetadata({
          stack: err.stack,
          url,
          guildId: interaction.guild?.id,
        })
        .error('❌ Error executing play command');

      const errorMessage =
        error instanceof Error
          ? error.message
          : 'An error occurred while trying to play the music.';

      await sendErrorResponse(interaction, errorMessage);
    }
  },
};
