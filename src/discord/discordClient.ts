import { ClientOptions, Client } from 'discord.js';

export interface DiscordConfig {
  token: string;
  clientId: string;
  guildId: string;
}

export abstract class DiscordClient extends Client {
  protected config: DiscordConfig;

  constructor(options: ClientOptions, config: DiscordConfig) {
    super(options);
    this.config = config;
  }

  abstract bootstrap(
    token: string,
    clientId: string,
    guildId: string
  ): Promise<void>;

  protected async validateToken(): Promise<boolean> {
    return this.token !== null && this.token.length > 0;
  }

  async login(token?: string): Promise<string> {
    return super.login(token);
  }
}
