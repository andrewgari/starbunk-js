import { ApplicationCommandOption, CommandInteraction } from 'discord.js';

export interface CommandData {
  name: string;
  description: string;
  type?: number;
  options?: ApplicationCommandOption[];
}

export interface Command {
  data: CommandData;
  permission?: string[];
  execute(interaction: CommandInteraction): Promise<void>;
}
