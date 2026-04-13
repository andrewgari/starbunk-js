// Discord utilities for DJCova
import { CommandInteraction, ChatInputCommandInteraction } from 'discord.js';
import { logger } from '../observability/logger';
import { SharedErrorCode, logError } from '@starbunk/shared/errors';

// Type alias for any command interaction type
type AnyCommandInteraction = CommandInteraction | ChatInputCommandInteraction;

/**
 * Common error response for interactions
 */
export async function sendErrorResponse(
  interaction: AnyCommandInteraction,
  message: string = 'An error occurred while processing your command.',
): Promise<void> {
  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: `❌ ${message}`, ephemeral: true });
    } else {
      await interaction.reply({ content: `❌ ${message}`, ephemeral: true });
    }
  } catch (error) {
    logError(logger, SharedErrorCode.DISCORD_API_ERROR, 'Failed to send error response', {
      cause: error,
    });
  }
}

/**
 * Common success response for interactions
 */
export async function sendSuccessResponse(
  interaction: AnyCommandInteraction,
  message: string,
): Promise<void> {
  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: `✅ ${message}`, ephemeral: false });
    } else {
      await interaction.reply({ content: `✅ ${message}`, ephemeral: false });
    }
  } catch (error) {
    logError(logger, SharedErrorCode.DISCORD_API_ERROR, 'Failed to send success response', {
      cause: error,
    });
  }
}
