import { DiscordService as BaseDiscordService } from '@starbunk/shared';
import { Client, GuildMember, Message } from 'discord.js';
import { logger } from '@/observability/logger';

/**
 * BlueBot-specific Discord service that extends the shared DiscordService
 * Provides BlueBot-specific functionality while inheriting core Discord operations
 */
export class BlueBotDiscordService extends BaseDiscordService {
  private static blueBotInstance: BlueBotDiscordService | null = null;

  private constructor() {
    // Call parent constructor through getInstance to maintain singleton pattern
    super();
    logger.debug('BlueBotDiscordService instance created');
  }

  /**
   * Get the singleton instance of BlueBotDiscordService
   */
  static getInstance(): BlueBotDiscordService {
    if (!BlueBotDiscordService.blueBotInstance) {
      BlueBotDiscordService.blueBotInstance = new BlueBotDiscordService();
    }
    return BlueBotDiscordService.blueBotInstance;
  }

  /**
   * Override setClient to add BlueBot-specific initialization
   */
  public setClient(client: Client): void {
    super.setClient(client);
    logger
      .withMetadata({
        bot_name: 'BlueBot',
        user_id: client.user?.id,
        user_tag: client.user?.tag,
      })
      .info('BlueBot Discord client initialized');
  }

  public async getEnemy(message: Message): Promise<GuildMember> {
    if (!process.env.BLUEBOT_ENEMY_USER_ID) {
      throw new Error('BLUEBOT_ENEMY_USER_ID environment variable is not set');
    }
    const client = message?.guild?.client || this.getClient();
    if (!client) {
      throw new Error('Failed to fetch client');
    }
    const guild = message?.guild;
    if (!guild) {
      throw new Error('Failed to fetch guild');
    }
    const enemy = await guild.members.fetch(process.env.BLUEBOT_ENEMY_USER_ID);
    if (!enemy) {
      throw new Error('Failed to fetch enemy member');
    }
    return enemy;
  }
}
