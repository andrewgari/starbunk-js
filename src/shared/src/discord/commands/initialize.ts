import { Client } from 'discord.js';
import type { Command } from './command';
import { CommandRegistry } from './command-registry';
import { deployCommands } from './deploy';
import { setupCommandHandlers } from './handlers';

/**
 * Initialize commands: create registry, deploy, and set up handlers
 * @param client - Discord client
 * @param commands - Array of commands to register
 */
export async function initializeCommands(
  client: Client,
  commands: Command[],
): Promise<CommandRegistry> {
  const registry = new CommandRegistry(commands);
  await deployCommands(client, registry);
  setupCommandHandlers(client, registry);
  return registry;
}
