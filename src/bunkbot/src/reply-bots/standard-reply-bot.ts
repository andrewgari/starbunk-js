import { ResponseResolver } from '@/reply-bots/resolvers/response-resolver';
import { ReplyBot } from '@/reply-bots/models/reply-bot';
import { Message } from 'discord.js';
import { DiscordService } from '@starbunk/shared/discord/discord-service';
import { BotIdentity } from '@/reply-bots/models/bot-identity';
import { Trigger } from '@/reply-bots/conditions/trigger';
import { logger } from '@/observability/logger';
import { getMetricsService } from '@starbunk/shared/observability/metrics-service';

export class StandardReplyBot implements ReplyBot {
  constructor(
    public name: string,
    public readonly identityResolver: (message: Message<boolean>) => Promise<BotIdentity>,
    public triggers: Trigger[],
    public ignore_bots: boolean = true,
    public ignore_humans: boolean = false,

  ) {}

  get identity() {
    return this.identityResolver;
  }

  public async handleMessage(message: Message): Promise<void> {
    const startTime = Date.now();
    const metrics = getMetricsService();

    // Truncate message content for logging (max 200 chars)
    const truncatedContent = message.content.length > 200
      ? message.content.substring(0, 200) + '...'
      : message.content;

    logger.withMetadata({
      bot_name: this.name,
      message_id: message.id,
      author_id: message.author.id,
      author_username: message.author.username,
      channel_id: message.channelId,
      guild_id: message.guildId,
      triggers_count: this.triggers.length,
      message_content: truncatedContent,
    }).debug(`Bot evaluating message`);

    // Implementation to handle the message
    for (const trigger of this.triggers) {
      try {
        const conditionMet = await trigger.condition(message);

        if (conditionMet) {
          logger.withMetadata({
            bot_name: this.name,
            trigger_name: trigger.name,
            message_id: message.id,
            author_id: message.author.id,
            author_username: message.author.username,
            channel_id: message.channelId,
            guild_id: message.guildId,
            trigger_message: truncatedContent,
          }).info(`Trigger condition met`);

          // Track trigger metric
          if (message.guildId && message.channelId) {
            metrics.trackBotTrigger(this.name, trigger.name || 'unnamed', message.guildId, message.channelId);
            metrics.trackUniqueUser(this.name, message.guildId, message.author.id);
          }

          // Resolve identity
          const identityStartTime = Date.now();
          const identity = await this.identity(message);
          const identityDuration = Date.now() - identityStartTime;

          logger.withMetadata({
            bot_name: this.name,
            resolved_name: identity.botName,
            duration_ms: identityDuration,
          }).debug(`Identity resolved`);

          // Generate response
          let response = trigger.responseGenerator(message);
          response = await ResponseResolver.resolve(response, message);

          // Truncate response for logging (max 200 chars)
          const truncatedResponse = response.length > 200
            ? response.substring(0, 200) + '...'
            : response;

          logger.withMetadata({
            bot_name: this.name,
            trigger_name: trigger.name,
            response_length: response.length,
            response_content: truncatedResponse,
          }).debug(`Response generated`);

          // Send message
          const sendStartTime = Date.now();
          await DiscordService.getInstance().sendMessageWithBotIdentity(
            message,
            identity,
            response,
          );
          const sendDuration = Date.now() - sendStartTime;

          const totalDuration = Date.now() - startTime;

          logger.withMetadata({
            bot_name: this.name,
            trigger_name: trigger.name,
            identity_name: identity.botName,
            message_id: message.id,
            author_id: message.author.id,
            author_username: message.author.username,
            channel_id: message.channelId,
            guild_id: message.guildId,
            trigger_message: truncatedContent,
            response_content: truncatedResponse,
            response_length: response.length,
            total_duration_ms: totalDuration,
            send_duration_ms: sendDuration,
          }).info(`Bot response sent successfully`);

          // Track metrics
          if (message.guildId && message.channelId) {
            metrics.trackBotResponse(this.name, message.guildId, message.channelId, 'success');
            metrics.trackBotResponseDuration(this.name, message.guildId, totalDuration);
          }

          return;
        } else {
          logger.withMetadata({
            bot_name: this.name,
            trigger_name: trigger.name,
            message_id: message.id,
          }).debug(`Trigger condition not met`);
        }
      } catch (error) {
        logger.withError(error).withMetadata({
          bot_name: this.name,
          trigger_name: trigger.name,
          message_id: message.id,
          guild_id: message.guildId,
        }).error(`Error evaluating trigger`);

        // Track error metric
        if (message.guildId && message.channelId) {
          metrics.trackBotResponse(this.name, message.guildId, message.channelId, 'error');
          metrics.trackBotError(this.name, 'trigger_evaluation_error', message.guildId);
        }
      }
    }

    logger.withMetadata({
      bot_name: this.name,
      message_id: message.id,
      triggers_evaluated: this.triggers.length,
    }).debug(`No triggers matched`);
  }
}
