import { CommandInteraction, Interaction } from 'discord.js';

import { Failure, Result, Success } from '@/utils/result';

import { CommandRegistry } from './commandRegistry';

export class InteractionHandler {
  private readonly commandRegistry: CommandRegistry;

  constructor(commandRegistry: CommandRegistry) {
    this.commandRegistry = commandRegistry;
  }

  async handleInteraction(
    interaction: Interaction
  ): Promise<Result<void, Error>> {
    try {
      if (!interaction.isCommand()) {
        return new Success(void 0);
      }

      return this.handleCommandInteraction(interaction);
    }
    catch (error) {
      return new Failure(
        error instanceof Error
          ? error
          : new Error('Failed to handle interaction')
      );
    }
  }

  private async handleCommandInteraction(
    interaction: CommandInteraction
  ): Promise<Result<void, Error>> {
    const command = this.commandRegistry.getCommand(interaction.commandName);

    if (!command) {
      return new Failure(
        new Error(`Command ${interaction.commandName} not found`)
      );
    }

    return command.execute(interaction);
  }
}
