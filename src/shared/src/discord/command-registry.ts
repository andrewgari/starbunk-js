import {
  Client,
  Interaction,
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord.js';
import { logLayer as logger } from '../observability/log-layer';

/**
 * Command interface for Discord slash commands
 */
export interface Command {
  data: RESTPostAPIChatInputApplicationCommandsJSONBody;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
}

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

/**
 * Set up interaction handlers for commands
 */
export function setupCommandHandlers(client: Client, registry: CommandRegistry): void {
  logger.info('Registering command interaction handlers');

  client.on('interactionCreate', async (interaction: Interaction) => {
    if (interaction.isChatInputCommand()) {
      try {
        const command = registry.getCommand(interaction.commandName);
        if (command) {
          logger
            .withMetadata({
              command_name: interaction.commandName,
              user_id: interaction.user.id,
              guild_id: interaction.guildId,
            })
            .info('Executing command');
          await command.execute(interaction);
        } else {
          logger.withMetadata({ command_name: interaction.commandName }).warn('Unknown command');
          await interaction.reply({
            content: `Unknown command: ${interaction.commandName}`,
            ephemeral: true,
          });
        }
      } catch (error) {
        logger
          .withError(error)
          .withMetadata({
            command_name: interaction.commandName,
          })
          .error('Error executing command');
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: 'An error occurred while executing the command.',
            ephemeral: true,
          });
        }
      }
    } else if (interaction.isAutocomplete()) {
      try {
        const command = registry.getCommand(interaction.commandName);
        if (command?.autocomplete) {
          await command.autocomplete(interaction);
        }
      } catch (error) {
        logger
          .withError(error)
          .withMetadata({
            command_name: interaction.commandName,
          })
          .error('Error in autocomplete');
      }
    }
  });
}

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
