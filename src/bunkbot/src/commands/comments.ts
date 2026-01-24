import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { logger } from '@/observability/logger';
import { BotRegistry } from '@/reply-bots/bot-registry';
import CommentConfigService from '@/reply-bots/services/comment-config-service';

const commandBuilder = new SlashCommandBuilder()
  .setName('comments')
  .setDescription('Configure bot comments')
  .addSubcommand((sub) =>
    sub
      .setName('set')
      .setDescription('Set comments for a bot (overrides YAML)')
      .addStringOption((opt) =>
        opt
          .setName('bot_name')
          .setDescription('Bot name')
          .setRequired(true)
          .setAutocomplete(true),
      )
      .addStringOption((opt) =>
        opt
          .setName('comments')
          .setDescription('Comments text - use | or newline to separate')
          .setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('append')
      .setDescription('Append comments for a bot')
      .addStringOption((opt) =>
        opt
          .setName('bot_name')
          .setDescription('Bot name')
          .setRequired(true)
          .setAutocomplete(true),
      )
      .addStringOption((opt) =>
        opt
          .setName('comments')
          .setDescription('Comments text - use | or newline to separate')
          .setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('get')
      .setDescription('Get current comments for a bot')
      .addStringOption((opt) =>
        opt
          .setName('bot_name')
          .setDescription('Bot name')
          .setRequired(true)
          .setAutocomplete(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('clear')
      .setDescription('Clear comments for a bot')
      .addStringOption((opt) =>
        opt
          .setName('bot_name')
          .setDescription('Bot name')
          .setRequired(true)
          .setAutocomplete(true),
      ),
  )
  .addSubcommand((sub) => sub.setName('list').setDescription('List bots and comment counts'))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

function validateBotExists(botName: string): boolean {
  const registry = BotRegistry.getInstance();
  return registry.getBotNames().includes(botName);
}

export default {
  data: commandBuilder.toJSON(),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const subcommand = interaction.options.getSubcommand();

    // Require administrator permissions
    const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
    if (!isAdmin) {
      await interaction.reply({
        content: 'You need administrator permissions to use this command.',
        ephemeral: true,
      });
      return;
    }

    try {
      const commentsSvc = CommentConfigService.getInstance();
      const registry = BotRegistry.getInstance();

      switch (subcommand) {
        case 'set': {
          const botName = interaction.options.getString('bot_name', true);
          const text = interaction.options.getString('comments', true);
          if (!validateBotExists(botName)) {
            await interaction.reply({ content: `Unknown bot: ${botName}`, ephemeral: true });
            return;
          }
          commentsSvc.setComments(botName, text);
          const list = commentsSvc.getComments(botName) || [];
          await interaction.reply({
            content: `Comments set for ${botName}. Count: ${list.length}`,
            ephemeral: true,
          });
          break;
        }

        case 'append': {
          const botName = interaction.options.getString('bot_name', true);
          const text = interaction.options.getString('comments', true);
          if (!validateBotExists(botName)) {
            await interaction.reply({ content: `Unknown bot: ${botName}`, ephemeral: true });
            return;
          }
          commentsSvc.appendComments(botName, text);
          const list = commentsSvc.getComments(botName) || [];
          await interaction.reply({
            content: `Comments appended for ${botName}. Count: ${list.length}`,
            ephemeral: true,
          });
          break;
        }

        case 'get': {
          const botName = interaction.options.getString('bot_name', true);
          if (!validateBotExists(botName)) {
            await interaction.reply({ content: `Unknown bot: ${botName}`, ephemeral: true });
            return;
          }
          const list = commentsSvc.getComments(botName) || [];
          if (list.length === 0) {
            await interaction.reply({
              content: `No comments configured for ${botName}.`,
              ephemeral: true,
            });
            return;
          }
          const message = `Comments for ${botName}:\n\n${list.map((c) => `- ${c}`).join('\n')}`;
          await interaction.reply({ content: message, ephemeral: true });
          break;
        }

        case 'clear': {
          const botName = interaction.options.getString('bot_name', true);
          if (!validateBotExists(botName)) {
            await interaction.reply({ content: `Unknown bot: ${botName}`, ephemeral: true });
            return;
          }
          commentsSvc.clearComments(botName);
          await interaction.reply({
            content: `Comments cleared for ${botName}.`,
            ephemeral: true,
          });
          break;
        }

        case 'list': {
          const botNames = registry.getBotNames();
          if (botNames.length === 0) {
            await interaction.reply({
              content: 'No bots registered.',
              ephemeral: true,
            });
            return;
          }
          const rows = botNames.map((name) => {
            const items = commentsSvc.getComments(name) || [];
            return `- ${name}: ${items.length} comment(s)`;
          });
          const message = `Bot comment overview:\n\n${rows.join('\n')}`;
          await interaction.reply({ content: message, ephemeral: true });
          break;
        }

        default: {
          await interaction.reply({ content: 'Unknown subcommand', ephemeral: true });
        }
      }
    } catch (error) {
      logger.withError(error).error('Error executing comments command');
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
      logger.withError(error).error('Error in comments command autocomplete');
      await interaction.respond([]);
    }
  },
};
