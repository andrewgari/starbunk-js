import { Message, TextChannel } from 'discord.js';
import { BlueReplyStrategy as BlueReplyStrategy } from '@/strategy/blue-reply-strategy';
import { BlueRequestStrategy } from '@/strategy/blue-request-strategy';
import { logger } from '@/observability/logger';
import { getMetricsService } from '@starbunk/shared/observability/metrics-service';

const blueRequestStrategy = new BlueRequestStrategy();
const blueReplyStrategy = new BlueReplyStrategy();

const strategies = [
  { name: 'BlueRequestStrategy', instance: blueRequestStrategy },
  { name: 'BlueReplyStrategy', instance: blueReplyStrategy },
];

/**
 * Reset all strategy state - useful for testing
 */
export function resetStrategies(): void {
  blueReplyStrategy.reset();
}

/**
 * Get the response for a message without sending it to Discord
 * Useful for testing and debugging
 */
export async function getResponseForMessage(message: Message): Promise<string | null> {
  for (const strategy of strategies) {
    if (await strategy.instance.shouldRespond(message)) {
      const response = await strategy.instance.getResponse(message);
      if (response) {
        return response;
      }
    }
  }
  return null;
}

export async function processMessageByStrategy(message: Message): Promise<void> {
  const metrics = getMetricsService();
  const startTime = Date.now();

  for (const strategy of strategies) {
    const strategyEvalStartTime = Date.now();

    logger
      .withMetadata({
        strategy_name: strategy.name,
        message_id: message.id,
        author_id: message.author.id,
        channel_id: message.channelId,
        guild_id: message.guildId,
      })
      .debug(`Evaluating strategy: ${strategy.name}`);

    let shouldRespond = false;
    try {
      shouldRespond = await strategy.instance.shouldRespond(message);
      const evalDuration = Date.now() - strategyEvalStartTime;

      // Track strategy evaluation
      if (message.guildId && message.channelId) {
        metrics.trackTriggerEvaluation(
          'BlueBot',
          strategy.name,
          message.guildId,
          message.channelId,
          shouldRespond ? 'matched' : 'not_matched',
          'human',
        );
        metrics.trackTriggerEvaluationDuration(
          'BlueBot',
          strategy.name,
          message.guildId,
          shouldRespond ? 'matched' : 'not_matched',
          evalDuration,
        );
      }

      logger
        .withMetadata({
          strategy_name: strategy.name,
          should_respond: shouldRespond,
          evaluation_duration_ms: evalDuration,
          message_id: message.id,
        })
        .debug(`Strategy evaluation complete: ${strategy.name}`);
    } catch (error) {
      const evalDuration = Date.now() - strategyEvalStartTime;
      logger
        .withError(error)
        .withMetadata({
          strategy_name: strategy.name,
          message_id: message.id,
          evaluation_duration_ms: evalDuration,
        })
        .error(`Strategy evaluation error: ${strategy.name}`);

      if (message.guildId && message.channelId) {
        metrics.trackTriggerEvaluation(
          'BlueBot',
          strategy.name,
          message.guildId,
          message.channelId,
          'error',
          'human',
        );
      }
      continue;
    }

    if (shouldRespond) {
      const responseStartTime = Date.now();

      logger
        .withMetadata({
          strategy_name: strategy.name,
          message_id: message.id,
        })
        .info(`✓ STRATEGY MATCHED - Strategy: ${strategy.name}`);

      // Track trigger
      if (message.guildId && message.channelId) {
        metrics.trackBotTrigger(
          'BlueBot',
          strategy.name,
          message.guildId,
          message.channelId,
          'strategy_match',
          'human',
        );
      }

      try {
        const response = await strategy.instance.getResponse(message);
        const responseDuration = Date.now() - responseStartTime;

        if (response) {
          logger
            .withMetadata({
              strategy_name: strategy.name,
              response_length: response.length,
              response_generation_duration_ms: responseDuration,
              message_id: message.id,
            })
            .debug(`Response generated: ${strategy.name}`);

          if (message.channel instanceof TextChannel) {
            const sendStartTime = Date.now();
            await message.channel.send(response);
            const sendDuration = Date.now() - sendStartTime;
            const totalDuration = Date.now() - startTime;

            logger
              .withMetadata({
                strategy_name: strategy.name,
                response_preview: response.substring(0, 100),
                response_length: response.length,
                send_duration_ms: sendDuration,
                total_duration_ms: totalDuration,
                message_id: message.id,
                channel_id: message.channelId,
                guild_id: message.guildId,
              })
              .info(
                `✓ BOT RESPONSE SENT - Strategy: ${strategy.name}, Duration: ${totalDuration}ms`,
              );

            // Track successful response
            if (message.guildId && message.channelId) {
              metrics.trackBotResponse('BlueBot', message.guildId, message.channelId, 'success');
              metrics.trackBotResponseDuration('BlueBot', message.guildId, totalDuration);
            }

            return;
          } else {
            logger
              .withMetadata({
                strategy_name: strategy.name,
                channel_type: message.channel.type,
                message_id: message.id,
              })
              .warn(`Cannot send response - not a text channel`);
          }
        } else {
          logger
            .withMetadata({
              strategy_name: strategy.name,
              message_id: message.id,
            })
            .warn(`Strategy matched but returned empty response`);
        }
      } catch (error) {
        logger
          .withError(error)
          .withMetadata({
            strategy_name: strategy.name,
            message_id: message.id,
            guild_id: message.guildId,
            channel_id: message.channelId,
          })
          .error(`Error generating/sending response: ${strategy.name}`);

        if (message.guildId && message.channelId) {
          metrics.trackBotResponse('BlueBot', message.guildId, message.channelId, 'error');
          metrics.trackBotError('BlueBot', 'response_generation_error', message.guildId);
        }
      }
    }
  }

  logger
    .withMetadata({
      message_id: message.id,
      strategies_evaluated: strategies.length,
      total_duration_ms: Date.now() - startTime,
    })
    .debug('No strategy matched');
}
