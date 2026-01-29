import { Client } from 'discord.js';
import { logLayer as logger } from '../../observability/log-layer';
import { CommandRegistry } from './command-registry';

/**
 * Deploy commands to Discord
 */
export async function deployCommands(client: Client, registry: CommandRegistry): Promise<void> {
  logger.info('Deploying slash commands to Discord...');
  const commandData = registry.getCommandData();
  const guildId = process.env.GUILD_ID;

  if (guildId) {
    logger.info(`Deploying commands to guild ${guildId}`);
    const guild = await client.guilds.fetch(guildId);
    await guild.commands.set(commandData);
  } else {
    logger.info('Deploying commands globally');
    await client.application!.commands.set(commandData);
  }

  logger.info(`Successfully deployed ${commandData.length} slash commands`);
}
