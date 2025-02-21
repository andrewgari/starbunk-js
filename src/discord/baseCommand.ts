import { CommandInteraction, PermissionResolvable } from 'discord.js';
import { CommandData } from './command';

export abstract class BaseCommand {
  abstract readonly data: CommandData;
  abstract readonly permissions?: PermissionResolvable[];

  abstract execute(interaction: CommandInteraction): Promise<void>;

  protected async reply(interaction: CommandInteraction, content: string): Promise<void> {
    try {
      await interaction.reply({ content, ephemeral: true });
    } catch (error) {
      console.error('Failed to reply to interaction:', error);
      if (!interaction.replied) {
        await interaction.reply({ 
          content: 'An error occurred while processing your command.',
          ephemeral: true 
        });
      }
    }
  }

  protected hasPermissions(interaction: CommandInteraction): boolean {
    if (!this.permissions?.length) return true;
    return this.permissions.every(permission => 
      interaction.memberPermissions?.has(permission)
    );
  }
} 