import { CommandInteraction, SlashCommandBuilder } from 'discord.js';

const commandBuilder = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Replies with pong');

export default {
  data: commandBuilder.toJSON(),
  async execute(interaction: CommandInteraction) {
    await interaction.reply('Pong.');
  },
};
