import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { logger } from '@/observability/logger';
import { BotStateManager } from '@/reply-bots/services/bot-state-manager';
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
    subcommand
      .setName('override')
      .setDescription('Set a frequency override for a bot')
      .addStringOption((option) =>
        option
          .setName('bot_name')
          .setDescription('Name of the bot to override')
          .setRequired(true)
          .setAutocomplete(true),
      )
      .addStringOption((option) =>
        option
          .setName('setting')
          .setDescription('Setting to override')
          .setRequired(true)
          .addChoices({ name: 'frequency', value: 'frequency' }),
      )
      .addNumberOption((option) =>
        option
          .setName('percent')
          .setDescription('Frequency percentage (0-100)')
          .setRequired(true)
          .setMinValue(0)
          .setMaxValue(100),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('reset')
      .setDescription('Reset a bot override to original values')
      .addStringOption((option) =>
        option
          .setName('bot_name')
          .setDescription('Name of the bot to reset')
          .setRequired(true)
          .setAutocomplete(true),
      )
      .addStringOption((option) =>
        option
          .setName('setting')
          .setDescription('Setting to reset')
          .setRequired(true)
          .addChoices({ name: 'frequency', value: 'frequency' }),
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

        case 'override': {
          const botName = interaction.options.getString('bot_name', true);
          const setting = interaction.options.getString('setting', true);
          const percent = interaction.options.getNumber('percent', true);

          if (setting === 'frequency') {
            const originalFrequency = stateManager.getOriginalFrequency(botName) ?? 100;
            stateManager.setFrequency(botName, percent, interaction.user.id, originalFrequency);

            await interaction.reply({
              content: `✅ ${botName} frequency set to ${percent}% (was ${originalFrequency}%)`,
              ephemeral: true,
            });
          }
          break;
        }

        case 'reset': {
          const botName = interaction.options.getString('bot_name', true);
          const setting = interaction.options.getString('setting', true);

          if (setting === 'frequency') {
            const original = stateManager.resetFrequency(botName);
            if (original !== undefined) {
              await interaction.reply({
                content: `✅ ${botName} frequency reset to ${original}%`,
                ephemeral: true,
              });
            } else {
              await interaction.reply({
                content: `ℹ️ ${botName} has no frequency override to reset`,
                ephemeral: true,
              });
            }
          }
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

          let message = `📊 Bot Status (${botNames.length} total)\n\n`;
          for (const botName of botNames) {
            const isEnabled = stateManager.isBotEnabled(botName);
            const statusIcon = isEnabled ? '✅' : '❌';
            const statusText = isEnabled ? 'ENABLED' : 'DISABLED';

            const currentFreq = stateManager.getFrequency(botName);
            const originalFreq = stateManager.getOriginalFrequency(botName);

            let frequencyInfo = '';
            if (currentFreq !== undefined) {
              frequencyInfo = ` [FREQ: ${currentFreq}% ← ${originalFreq ?? 100}%]`;
            }

            message += `${statusIcon} ${botName.padEnd(20)} [${statusText}]${frequencyInfo}\n`;
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
      logger.withError(error).error('Error executing bot command');
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
      logger.withError(error).error('Error in bot command autocomplete');
      await interaction.respond([]);
    }
  },
};

