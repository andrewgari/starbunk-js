import { CommandInteraction, SlashCommandBuilder, Webhook } from 'discord.js';
import Client from '../discord/discordClient';

export default {
  data: new SlashCommandBuilder()
    .setName('clearwebhooks')
    .setDescription('Clear all webhooks made by the bot'),
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
