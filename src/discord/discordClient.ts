import { ClientOptions, Client } from 'discord.js';

export interface DiscordConfig {
  token: string;
  clientId: string;
  guildId: string;
}

export class DiscordClient extends Client {
  protected config: DiscordConfig;

  constructor(options: ClientOptions, config: DiscordConfig) {
    super(options);
    this.config = config;
  }

  protected async validateToken(): Promise<boolean> {
    return this.token !== null && this.token.length > 0;
  }
}
