import { ReplyBot } from '@/reply-bots/models/reply-bot';
import { Message } from 'discord.js';
import { logger } from '@/observability/logger';
import { getMetricsService } from '@starbunk/shared/observability/metrics-service';
import { getTraceService } from '@starbunk/shared/observability/trace-service';
import { BotStateManager } from '@/reply-bots/services/bot-state-manager';

export class BotRegistry {
  private static instance: BotRegistry | null = null;
  private bots: Map<string, ReplyBot> = new Map();

  static getInstance(): BotRegistry {
    if (!BotRegistry.instance) {
      BotRegistry.instance = new BotRegistry();
    }
    return BotRegistry.instance;
  }

  static setInstance(instance: BotRegistry): void {
    BotRegistry.instance = instance;
  }

  public register(bot: ReplyBot) {
    if (this.bots.has(bot.name)) {
      logger
        .withMetadata({
          bot_name: bot.name,
          existing_bots: this.bots.size,
        })
        .warn(`Bot with name ${bot.name} already exists, skipping registration`);
      return;
    }

    this.bots.set(bot.name, bot);
    logger
      .withMetadata({
        bot_name: bot.name,
        total_bots: this.bots.size,
        ignore_bots: bot.ignore_bots,
        ignore_humans: bot.ignore_humans,
      })
      .info(`Bot registered successfully`);
  }

  public getBots(): ReplyBot[] {
    return Array.from(this.bots.values());
  }

  public getBotNames(): string[] {
    return Array.from(this.bots.keys());
  }

  public async processMessage(message: Message) {
    const startTime = Date.now();
    const metrics = getMetricsService();
    const tracing = getTraceService('bunkbot');
    const stateManager = BotStateManager.getInstance();

    // Start root span for message processing
    const messageSpan = tracing.startMessageProcessing(
      message.id,
      message.guildId || 'dm',
      message.channelId,
      message.author.id,
    );

    // Get trace context for logging
    const traceId = tracing.getTraceId(messageSpan);
    const spanId = tracing.getSpanId(messageSpan);

    // Lazy evaluation: only extract detailed message context if debug logging is enabled
    const getMessageContext = () => ({
      has_mentions: message.mentions.users.size > 0,
      mentioned_users: Array.from(message.mentions.users.values())
        .map(u => u.username)
        .join(', '),
      mention_count: message.mentions.users.size,
      has_role_mentions: message.mentions.roles.size > 0,
      role_mention_count: message.mentions.roles.size,
      has_attachments: message.attachments.size > 0,
      attachment_count: message.attachments.size,
      attachment_types: Array.from(message.attachments.values())
        .map(a => a.contentType)
        .join(', '),
      is_reply: !!message.reference,
      replied_to_message_id: message.reference?.messageId,
      has_embeds: message.embeds.length > 0,
      embed_count: message.embeds.length,
      has_stickers: message.stickers.size > 0,
      sticker_count: message.stickers.size,
    });

    logger
      .withMetadata({
        message_id: message.id,
        author_id: message.author.id,
        author_name: message.author.username,
        author_is_bot: message.author.bot,
        author_type: message.author.bot ? 'bot' : 'human',
        channel_id: message.channelId,
        guild_id: message.guildId,
        content_length: message.content.length,
        total_bots: this.bots.size,
        trace_id: traceId,
        span_id: spanId,
        timestamp: message.createdAt.toISOString(),
        ...getMessageContext(),
      })
      .debug('Processing message');

    let botsProcessed = 0;
    let botsSkipped = 0;

    for (const bot of this.bots.values()) {
      // Check if bot is enabled
      if (!stateManager.isBotEnabled(bot.name)) {
        logger
          .withMetadata({
            bot_name: bot.name,
          })
          .debug(`Bot ${bot.name} skipped message (disabled)`);
        botsSkipped++;
        continue;
      }

      if (bot.ignore_bots && message.author.bot) {
        logger
          .withMetadata({
            bot_name: bot.name,
            author_is_bot: true,
          })
          .debug(`Bot ${bot.name} skipped message (ignore_bots=true)`);
        botsSkipped++;
        continue;
      }

      if (bot.ignore_humans && !message.author.bot) {
        logger
          .withMetadata({
            bot_name: bot.name,
            author_is_bot: false,
          })
          .debug(`Bot ${bot.name} skipped message (ignore_humans=true)`);
        botsSkipped++;
        continue;
      }

      try {
        await bot.handleMessage(message);
        botsProcessed++;
      } catch (error) {
        logger
          .withError(error)
          .withMetadata({
            bot_name: bot.name,
            message_id: message.id,
            guild_id: message.guildId,
            channel_id: message.channelId,
          })
          .error(`Bot ${bot.name} failed to handle message`);

        if (message.guildId) {
          metrics.trackBotError(bot.name, 'message_handling_error', message.guildId);
        }
      }
    }

    const duration = Date.now() - startTime;

    // End message processing span
    tracing.endSpanSuccess(messageSpan, {
      'message.bots_processed': botsProcessed,
      'message.bots_skipped': botsSkipped,
      'message.total_bots': this.bots.size,
      'message.processing_duration_ms': duration,
    });

    logger
      .withMetadata({
        message_id: message.id,
        author_id: message.author.id,
        author_username: message.author.username,
        author_type: message.author.bot ? 'bot' : 'human',
        channel_id: message.channelId,
        guild_id: message.guildId,
        bots_processed: botsProcessed,
        bots_skipped: botsSkipped,
        total_bots: this.bots.size,
        duration_ms: duration,
        timestamp: new Date().toISOString(),
        trace_id: traceId,
        span_id: spanId,
      })
      .debug('Message processing complete');
  }
}
