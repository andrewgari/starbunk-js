import { Client, Message } from 'discord.js';
import { logger } from '@/observability/logger';
import { processMessageByStrategy } from '@/strategy/strategy-router';
import { getMetricsService } from '@starbunk/shared/observability/metrics-service';

export class BlueBot {
  constructor(private readonly client: Client) {}

  async start(): Promise<void> {
    this.client.on('messageCreate', async (message: Message) => {
      // Basic bot-loop safety: never respond to other bots or self
      if (message.author.bot) {
        logger
          .withMetadata({
            message_id: message.id,
            author_id: message.author.id,
            author_username: message.author.username,
            author_is_bot: true,
          })
          .debug('Ignoring bot message');
        return;
      }

      const metrics = getMetricsService();

      // Track message processing
      if (message.guildId && message.channelId) {
        metrics.trackMessageProcessed(message.guildId, message.channelId);
      }

      logger
        .withMetadata({
          message_id: message.id,
          author_id: message.author.id,
          author_username: message.author.username,
          channel_id: message.channelId,
          guild_id: message.guildId,
          content_length: message.content.length,
          has_attachments: message.attachments ? message.attachments.size > 0 : false,
          has_embeds: message.embeds.length > 0,
        })
        .debug('Processing message');

      try {
        await processMessageByStrategy(message);
      } catch (error) {
        logger
          .withError(error)
          .withMetadata({
            message_id: message.id,
            guild_id: message.guildId,
            channel_id: message.channelId,
          })
          .error('Error handling message');

        if (message.guildId) {
          metrics.trackBotError('BlueBot', 'message_handling_error', message.guildId);
        }
      }
    });
  }
}
