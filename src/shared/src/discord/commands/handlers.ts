import { Client, Interaction } from 'discord.js';
import { logLayer as logger } from '../../observability/log-layer';
import { CommandRegistry } from './command-registry';

/**
 * Set up interaction handlers for commands
 */
export function setupCommandHandlers(client: Client, registry: CommandRegistry): void {
  logger.info('Registering command interaction handlers');

  client.on('interactionCreate', async (interaction: Interaction) => {
    if (interaction.isChatInputCommand()) {
      try {
        const command = registry.getCommand(interaction.commandName);
        if (command) {
          logger
            .withMetadata({
              command_name: interaction.commandName,
              user_id: interaction.user.id,
              guild_id: interaction.guildId,
            })
            .info('Executing command');
          await command.execute(interaction);
        } else {
          logger.withMetadata({ command_name: interaction.commandName }).warn('Unknown command');
          await interaction.reply({
            content: `Unknown command: ${interaction.commandName}`,
            ephemeral: true,
          });
        }
      } catch (error) {
        logger
          .withError(error)
          .withMetadata({
            command_name: interaction.commandName,
          })
          .error('Error executing command');
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: 'An error occurred while executing the command.',
            ephemeral: true,
          });
        }
      }
    } else if (interaction.isAutocomplete()) {
      try {
        const command = registry.getCommand(interaction.commandName);
        if (command?.autocomplete) {
          await command.autocomplete(interaction);
        }
      } catch (error) {
        logger
          .withError(error)
          .withMetadata({
            command_name: interaction.commandName,
          })
          .error('Error in autocomplete');
      }
    }
  });
}
