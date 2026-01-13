import { ReplyBot } from "./models/reply-bot";
import { Message } from 'discord.js';
import { logger } from '@/observability/logger';
import { getMetricsService } from '@/observability/metrics-service';

export class BotRegistry {
  private bots: Map<string, ReplyBot> = new Map();

  public register(bot: ReplyBot) {
    if (this.bots.has(bot.name)) {
      logger.warn(`Bot with name ${bot.name} already exists, skipping registration`, {
        bot_name: bot.name,
        existing_bots: this.bots.size,
      });
      return;
    }

    this.bots.set(bot.name, bot);
    logger.info(`Bot registered successfully`, {
      bot_name: bot.name,
      total_bots: this.bots.size,
      ignore_bots: bot.ignore_bots,
      ignore_humans: bot.ignore_humans,
    });
  }

  public getBots(): ReplyBot[] {
    return Array.from(this.bots.values());
  }

  public async processmessage(message: Message) {
    const startTime = Date.now();
    const metrics = getMetricsService();

    logger.debug('Processing message', {
      message_id: message.id,
      author_id: message.author.id,
      author_name: message.author.username,
      author_is_bot: message.author.bot,
      channel_id: message.channelId,
      guild_id: message.guildId,
      content_length: message.content.length,
      total_bots: this.bots.size,
    });

    let botsProcessed = 0;
    let botsSkipped = 0;

    for (const bot of this.bots.values()) {
      if (bot.ignore_bots && message.author.bot) {
        logger.debug(`Bot ${bot.name} skipped message (ignore_bots=true)`, {
          bot_name: bot.name,
          author_is_bot: true,
        });
        botsSkipped++;
        continue;
      }

      if (bot.ignore_humans && !message.author.bot) {
        logger.debug(`Bot ${bot.name} skipped message (ignore_humans=true)`, {
          bot_name: bot.name,
          author_is_bot: false,
        });
        botsSkipped++;
        continue;
      }

      try {
        await bot.handleMessage(message);
        botsProcessed++;
      } catch (error) {
        logger.error(`Bot ${bot.name} failed to handle message`, error, {
          bot_name: bot.name,
          message_id: message.id,
          guild_id: message.guildId,
          channel_id: message.channelId,
        });

        if (message.guildId) {
          metrics.trackBotError(bot.name, 'message_handling_error', message.guildId);
        }
      }
    }

    const duration = Date.now() - startTime;
    logger.debug('Message processing complete', {
      message_id: message.id,
      bots_processed: botsProcessed,
      bots_skipped: botsSkipped,
      duration_ms: duration,
    });
  }
}
