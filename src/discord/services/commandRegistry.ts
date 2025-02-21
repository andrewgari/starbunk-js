import { Collection } from 'discord.js';
import { Result, Success, Failure } from '@/utils/result';
import { Command } from '../command';

export class CommandRegistry {
  private commands: Collection<string, Command> = new Collection();

  async registerCommand(command: Command): Promise<Result<void, Error>> {
    try {
      const name = command.data.name;
      if (!name) {
        return new Failure(new Error('Command name is required'));
      }

      if (this.commands.has(name)) {
        return new Failure(new Error(`Command ${name} is already registered`));
      }

      this.commands.set(name, command);
      return new Success(void 0);
    } catch (error) {
      return new Failure(
        error instanceof Error ? error : new Error('Failed to register command')
      );
    }
  }

  getCommand(name: string): Command | undefined {
    return this.commands.get(name);
  }

  getAllCommands(): Command[] {
    return Array.from(this.commands.values());
  }

  getCommandData(): unknown[] {
    return this.getAllCommands().map((command) => command.data);
  }
}
