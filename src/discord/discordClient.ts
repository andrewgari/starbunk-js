import { Client } from 'discord.js';

export default abstract class DiscordClient extends Client {
  abstract bootstrap(...args: any[]): void;
}
