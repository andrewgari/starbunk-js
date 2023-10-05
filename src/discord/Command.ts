import { ApplicationCommandOption, CommandInteraction } from 'discord.js';

export interface Command {
  data: {
    name: string;
    description: string;
    type?: number;
    options?: ApplicationCommandOption[];
  };
  permission?: string[];
  execute(interaction: CommandInteraction): any;
}
