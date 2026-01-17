import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { logger } from '@starbunk/shared/observability/logger';
import { BotStateManager } from '@/services/bot-state-manager';
import { BotRegistry } from '@/reply-bots/bot-registry';

const commandBuilder = new SlashCommandBuilder()
  .setName('bot')
  .setDescription('Manage bot settings')
  .addSubcommand((subcommand) =>
    subcommand
      .setName('enable')
      .setDescription('Enable a bot')
      .addStringOption((option) =>
        option
          .setName('bot_name')
          .setDescription('Name of the bot to enable')
          .setRequired(true)
          .setAutocomplete(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('disable')
      .setDescription('Disable a bot')
      .addStringOption((option) =>
        option
          .setName('bot_name')
          .setDescription('Name of the bot to disable')
          .setRequired(true)
          .setAutocomplete(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand.setName('list').setDescription('List all available bots and their status'),
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export default {
  data: commandBuilder.toJSON(),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const subcommand = interaction.options.getSubcommand();
    const stateManager = BotStateManager.getInstance();

    // Check permissions for admin commands
    const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
    if (!isAdmin) {
      await interaction.reply({
        content: 'You need administrator permissions to use this command.',
        ephemeral: true,
      });
      return;
    }

    try {
      switch (subcommand) {
        case 'enable': {
          const botName = interaction.options.getString('bot_name', true);
          stateManager.enableBot(botName);
          await interaction.reply({
            content: `Bot ${botName} has been enabled.`,
            ephemeral: true,
          });
          break;
        }

        case 'disable': {
          const botName = interaction.options.getString('bot_name', true);
          stateManager.disableBot(botName);
          await interaction.reply({
            content: `Bot ${botName} has been disabled.`,
            ephemeral: true,
          });
          break;
        }

        case 'list': {
          const registry = BotRegistry.getInstance();
          const botNames = registry.getBotNames();

          if (botNames.length === 0) {
            await interaction.reply({
              content: 'No bots registered.',
              ephemeral: true,
            });
            return;
          }

          let message = '**Bot Status**\n\n';
          for (const botName of botNames) {
            const isEnabled = stateManager.isBotEnabled(botName);
            message += `- ${botName}: ${isEnabled ? '✅ Enabled' : '❌ Disabled'}\n`;
          }

          await interaction.reply({
            content: message,
            ephemeral: true,
          });
          break;
        }

        default: {
          await interaction.reply({
            content: 'Unknown subcommand',
            ephemeral: true,
          });
        }
      }
    } catch (error) {
      logger.error('Error executing bot command', error);
      await interaction.reply({
        content: 'An error occurred while executing the command',
        ephemeral: true,
      });
    }
  },

  async autocomplete(interaction: AutocompleteInteraction): Promise<void> {
    const focusedValue = interaction.options.getFocused().toLowerCase();

    try {
      const registry = BotRegistry.getInstance();
      const choices = registry.getBotNames();
      const filtered = choices.filter((choice) => choice.toLowerCase().includes(focusedValue));
      await interaction.respond(filtered.map((choice) => ({ name: choice, value: choice })));
    } catch (error) {
      logger.error('Error in bot command autocomplete', error);
      await interaction.respond([]);
    }
  },
};

