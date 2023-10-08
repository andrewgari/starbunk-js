import {
  CommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  Webhook
} from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('clearwebhooks')
    .setDescription('Clear all webhooks made by the bot')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageWebhooks),
  async execute(interaction: CommandInteraction) {
    await interaction.reply({
      content: 'Clearing Webhooks now, boss',
      fetchReply: false,
      ephemeral: true
    });
    interaction.guild
      ?.fetchWebhooks()
      .then((webhooks) => {
        webhooks.forEach(async (webhook: Webhook) => {
          if (webhook.name.startsWith('Bunkbot-')) {
            await interaction.followUp({
              content: `Deleting ${webhook.name}`,
              fetchReply: false,
              ephemeral: true
            });
            await webhook.delete();
          }
        });
      })
      .catch(console.error);
  }
};
