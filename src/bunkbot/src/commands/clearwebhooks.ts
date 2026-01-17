import { CommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { logger } from '@starbunk/shared/observability/logger';

const commandBuilder = new SlashCommandBuilder()
  .setName('clearwebhooks')
  .setDescription('Clear all webhooks made by the bot')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageWebhooks);

export default {
  data: commandBuilder.toJSON(),
  async execute(interaction: CommandInteraction) {
    await interaction.reply({
      content: 'Clearing webhooks now...',
      ephemeral: true,
    });

    try {
      const webhooks = await interaction.guild?.fetchWebhooks();
      if (!webhooks) {
        await interaction.followUp({
          content: 'Could not fetch webhooks.',
          ephemeral: true,
        });
        return;
      }

      let deletedCount = 0;
      for (const webhook of webhooks.values()) {
        if (webhook.name === 'Starbunk Bot') {
          await webhook.delete();
          deletedCount++;
          logger.info('Webhook deleted', {
            webhook_id: webhook.id,
            webhook_name: webhook.name,
            guild_id: interaction.guildId,
          });
        }
      }

      await interaction.followUp({
        content: `Deleted ${deletedCount} webhook(s).`,
        ephemeral: true,
      });
    } catch (error) {
      logger.error('Failed to clear webhooks', error);
      await interaction.followUp({
        content: 'Failed to clear webhooks.',
        ephemeral: true,
      });
    }
  },
};

