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

    const authorType: 'bot' | 'human' = message.author.bot ? 'bot' : 'human';

    // Extract message context for telemetry
    const messageContext = {
      has_mentions: message.mentions.users.size > 0,
      mention_count: message.mentions.users.size,
      has_attachments: message.attachments.size > 0,
      attachment_count: message.attachments.size,
      is_reply: !!message.reference,
      replied_to_message_id: message.reference?.messageId,
      has_embeds: message.embeds.length > 0,
      embed_count: message.embeds.length,
    };

    logger.withMetadata({
      bot_name: this.name,
      message_id: message.id,
      author_id: message.author.id,
      author_username: message.author.username,
      author_type: authorType,
      channel_id: message.channelId,
      guild_id: message.guildId,
      triggers_count: this.triggers.length,
      message_content: truncatedContent,
      message_length: message.content.length,
      ...messageContext,
    }).debug(`Bot evaluating message`);

    // Implementation to handle the message
    for (const trigger of this.triggers) {
      const triggerEvalStartTime = Date.now();
      const triggerName = trigger.name || 'unnamed';
      const conditionType = trigger.metadata?.conditionType || 'unknown';
      const conditionDescription = trigger.metadata?.description || 'No description';

      try {
        logger.withMetadata({
          bot_name: this.name,
          trigger_name: triggerName,
          condition_type: conditionType,
          condition_description: conditionDescription,
          condition_details: trigger.metadata?.conditionDetails,
          message_id: message.id,
        }).debug(`Evaluating trigger condition`);

        const conditionMet = await trigger.condition(message);
        const triggerEvalDuration = Date.now() - triggerEvalStartTime;

        // Track trigger evaluation metrics
        if (message.guildId && message.channelId) {
          metrics.trackTriggerEvaluation(
            this.name,
            triggerName,
            message.guildId,
            message.channelId,
            conditionMet ? 'matched' : 'not_matched',
            authorType
          );
          metrics.trackTriggerEvaluationDuration(
            this.name,
            triggerName,
            message.guildId,
            conditionMet ? 'matched' : 'not_matched',
            triggerEvalDuration
          );
        }

        if (conditionMet) {
          logger.withMetadata({
            bot_name: this.name,
            trigger_name: triggerName,
            condition_type: conditionType,
            condition_description: conditionDescription,
            condition_details: trigger.metadata?.conditionDetails,
            message_id: message.id,
            author_id: message.author.id,
            author_username: message.author.username,
            author_type: authorType,
            channel_id: message.channelId,
            guild_id: message.guildId,
            trigger_message: truncatedContent,
            evaluation_duration_ms: triggerEvalDuration,
            timestamp: new Date().toISOString(),
            ...messageContext,
          }).info(`✓ TRIGGER FIRED - WHAT: ${this.name}/${triggerName}, HOW: ${conditionDescription}, WHEN: ${new Date().toISOString()}, WHO: ${message.author.username} (${authorType})`);

          // Track trigger metric
          if (message.guildId && message.channelId) {
            metrics.trackBotTrigger(
              this.name,
              triggerName,
              message.guildId,
              message.channelId,
              conditionType,
              authorType
            );
            metrics.trackUniqueUser(this.name, message.guildId, message.author.id);
          }

          // Resolve identity
          const identityStartTime = Date.now();
          const identity = await this.identity(message);
          const identityDuration = Date.now() - identityStartTime;

          logger.withMetadata({
            bot_name: this.name,
            trigger_name: triggerName,
            resolved_name: identity.botName,
            duration_ms: identityDuration,
          }).debug(`Identity resolved`);

          // Generate response
          const responseGenStartTime = Date.now();
          let response = trigger.responseGenerator(message);
          response = await ResponseResolver.resolve(response, message);
          const responseGenDuration = Date.now() - responseGenStartTime;

          // Truncate response for logging (max 200 chars)
          const truncatedResponse = response.length > 200
            ? response.substring(0, 200) + '...'
            : response;

          logger.withMetadata({
            bot_name: this.name,
            trigger_name: triggerName,
            response_length: response.length,
            response_content: truncatedResponse,
            duration_ms: responseGenDuration,
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
            trigger_name: triggerName,
            condition_type: conditionType,
            identity_name: identity.botName,
            message_id: message.id,
            author_id: message.author.id,
            author_username: message.author.username,
            author_type: authorType,
            channel_id: message.channelId,
            guild_id: message.guildId,
            trigger_message: truncatedContent,
            response_content: truncatedResponse,
            response_length: response.length,
            total_duration_ms: totalDuration,
            trigger_eval_duration_ms: triggerEvalDuration,
            identity_duration_ms: identityDuration,
            response_gen_duration_ms: responseGenDuration,
            send_duration_ms: sendDuration,
            timestamp: new Date().toISOString(),
          }).info(`✓ BOT RESPONSE SENT - Bot: ${this.name}, Trigger: ${triggerName}, Identity: ${identity.botName}, Duration: ${totalDuration}ms`);

          // Track metrics
          if (message.guildId && message.channelId) {
            metrics.trackBotResponse(this.name, message.guildId, message.channelId, 'success');
            metrics.trackBotResponseDuration(this.name, message.guildId, totalDuration);
          }

          return;
        } else {
          logger.withMetadata({
            bot_name: this.name,
            trigger_name: triggerName,
            condition_type: conditionType,
            condition_description: conditionDescription,
            message_id: message.id,
            evaluation_duration_ms: triggerEvalDuration,
          }).debug(`✗ Trigger condition not met`);
        }
      } catch (error) {
        const triggerEvalDuration = Date.now() - triggerEvalStartTime;

        logger.withError(error).withMetadata({
          bot_name: this.name,
          trigger_name: triggerName,
          condition_type: conditionType,
          message_id: message.id,
          guild_id: message.guildId,
          evaluation_duration_ms: triggerEvalDuration,
        }).error(`⚠ Error evaluating trigger`);

        // Track error metrics
        if (message.guildId && message.channelId) {
          metrics.trackBotResponse(this.name, message.guildId, message.channelId, 'error');
          metrics.trackBotError(this.name, 'trigger_evaluation_error', message.guildId);
          metrics.trackTriggerEvaluation(
            this.name,
            triggerName,
            message.guildId,
            message.channelId,
            'error',
            authorType
          );
          metrics.trackTriggerEvaluationDuration(
            this.name,
            triggerName,
            message.guildId,
            'error',
            triggerEvalDuration
          );
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
