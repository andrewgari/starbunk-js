import { CommandInteraction } from 'discord.js';
import Client from '../../discord/DiscordClient';

export default (client: Client, interaction: CommandInteraction) => {
  if (!interaction.isCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) return;

  try {
    command.run(client, interaction);
  } catch (e) {
    const message = 'Some error occured while running the command';
    if (interaction.replied) {
      interaction.followUp(message);
    } else {
      interaction.reply(message);
    }
  }
};
