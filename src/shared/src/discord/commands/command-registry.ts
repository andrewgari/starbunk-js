import { RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord.js';
import { logLayer as logger } from '../../observability/log-layer';
import type { Command } from './command';

/**
 * Generic registry for Discord slash commands
 * Can be used by any bot to manage their commands
 */
export class CommandRegistry {
  private commands: Map<string, Command>;

  /**
   * Create a new command registry
   * @param commands - Array of commands to register
   */
  constructor(commands: Command[]) {
    this.commands = new Map<string, Command>();
    this.registerCommands(commands);
  }

  /**
   * Register commands in the registry
   */
  private registerCommands(commands: Command[]) {
    for (const command of commands) {
      this.commands.set(command.data.name, command);
    }

    logger.info(
      `Registered ${this.commands.size} commands: ${Array.from(this.commands.keys()).join(', ')}`,
    );
  }

  /**
   * Get a command by name
   */
  getCommand(name: string): Command | undefined {
    return this.commands.get(name);
  }

  /**
   * Get all command data for deployment
   */
  getCommandData(): RESTPostAPIChatInputApplicationCommandsJSONBody[] {
    return Array.from(this.commands.values()).map(cmd => cmd.data);
  }

  /**
   * Get the number of registered commands
   */
  getCommandCount(): number {
    return this.commands.size;
  }
}
