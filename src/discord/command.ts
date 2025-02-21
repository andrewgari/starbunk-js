import {
  ApplicationCommandOption,
  CommandInteraction,
  PermissionResolvable,
  PermissionsBitField
} from 'discord.js';
import { Result } from '@/utils/result';

export interface Command {
  data: {
    name: string;
    description: string;
    type?: number;
    options?: ApplicationCommandOption[];
  };
  permission?: string[];
  execute(interaction: CommandInteraction): Promise<Result<void, Error>>;
}

export abstract class BaseCommand implements Command {
  abstract data: Command['data'];
  abstract permission?: string[];
  abstract execute(
    interaction: CommandInteraction
  ): Promise<Result<void, Error>>;

  protected validatePermissions(interaction: CommandInteraction): boolean {
    if (!this.permission?.length) return true;
    return this.permission.every(
      (perm) =>
        interaction.member?.permissions instanceof PermissionsBitField &&
        interaction.member.permissions.has(perm as PermissionResolvable)
    );
  }
}
