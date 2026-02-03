import { Message, TextChannel } from 'discord.js';
import { logger } from '@/observability/logger';
import { getMetricsService } from '@starbunk/shared/observability/metrics-service';
import { RequestConfirmStrategy } from '@/strategy/blue-request-confirm-strategy';
import { RequestConfirmEnemyStrategy } from '@/strategy/blue-request-confirm-enemy-strategy';

/**
 * Lightweight helpers to reduce repeated guild/channel guards around metrics tracking
 */
function trackTriggerEvaluationSafe(
  metrics: ReturnType<typeof getMetricsService>,
  botName: string,
  strategyName: string,
  message: Message,
  outcome: 'matched' | 'not_matched' | 'error',
  durationMs?: number,
): void {
  if (!message.guildId || !message.channelId) return;
  metrics.trackTriggerEvaluation(
    botName,
    strategyName,
    message.guildId,
    message.channelId,
    outcome,
    'human',
  );
  if (typeof durationMs === 'number') {
    metrics.trackTriggerEvaluationDuration(
      botName,
      strategyName,
      message.guildId,
      outcome,
      durationMs,
    );
  }
}

function trackBotTriggerSafe(
  metrics: ReturnType<typeof getMetricsService>,
  botName: string,
  strategyName: string,
  message: Message,
): void {
  if (!message.guildId || !message.channelId) return;
  metrics.trackBotTrigger(
    botName,
    strategyName,
    message.guildId,
    message.channelId,
    'strategy_match',
    'human',
  );
}

function trackBotResponseSafe(
  metrics: ReturnType<typeof getMetricsService>,
  botName: string,
  message: Message,
  status: 'success' | 'error',
  totalDurationMs?: number,
): void {
  if (!message.guildId || !message.channelId) return;
  metrics.trackBotResponse(botName, message.guildId, message.channelId, status);
  if (status === 'success' && typeof totalDurationMs === 'number') {
    metrics.trackBotResponseDuration(botName, message.guildId, totalDurationMs);
  }
}

/**
 * Get the response for a message without sending it to Discord
 * Useful for testing and debugging
 */
export async function getResponseForMessage(message: Message): Promise<string | null> {
  const complimentStrategy = new RequestConfirmStrategy(message);
  const insultStrategy = new RequestConfirmEnemyStrategy(message);

  if (await insultStrategy.shouldTrigger()) {
    const response = await insultStrategy.getResponse();
    return response;
  } else if (await complimentStrategy.shouldTrigger()) {
    const response = await complimentStrategy.getResponse();
    return response;
  }

  return null;
}

export async function processMessageByStrategy(message: Message): Promise<void> {
  const metrics = getMetricsService();
  const startTime = Date.now();

  const complimentStrategy = new RequestConfirmStrategy(message);
  const insultStrategy = new RequestConfirmEnemyStrategy(message);

  // Execute insult strategy first
  if (await executeStrategy('insult', insultStrategy, message, metrics, startTime)) {
    return;
  }

  // Execute compliment strategy second
  if (await executeStrategy('compliment', complimentStrategy, message, metrics, startTime)) {
    return;
  }

  logger
    .withMetadata({
      message_id: message.id,
      strategies_evaluated: 2,
      total_duration_ms: Date.now() - startTime,
    })
    .debug('No strategy matched');
}

async function executeStrategy(
  name: string,
  instance:
    | InstanceType<typeof RequestConfirmStrategy>
    | InstanceType<typeof RequestConfirmEnemyStrategy>,
  message: Message,
  metrics: ReturnType<typeof getMetricsService>,
  startTime: number,
): Promise<boolean> {
  const strategyEvalStartTime = Date.now();

  logger
    .withMetadata({
      strategy_name: name,
      message_id: message.id,
      author_id: message.author.id,
      channel_id: message.channelId,
      guild_id: message.guildId,
    })
    .debug(`Evaluating strategy: ${name}`);

  let shouldRespond = false;
  try {
    shouldRespond = await instance.shouldTrigger();
  } catch (error) {
    const evalDuration = Date.now() - strategyEvalStartTime;
    logger
      .withError(error)
      .withMetadata({
        strategy_name: name,
        message_id: message.id,
        evaluation_duration_ms: evalDuration,
      })
      .error(`Strategy evaluation error: ${name}`);

    trackTriggerEvaluationSafe(metrics, 'BlueBot', name, message, 'error');
    return false;
  }

  const evalDuration = Date.now() - strategyEvalStartTime;
  trackTriggerEvaluationSafe(
    metrics,
    'BlueBot',
    name,
    message,
    shouldRespond ? 'matched' : 'not_matched',
    evalDuration,
  );

  logger
    .withMetadata({
      strategy_name: name,
      should_respond: shouldRespond,
      evaluation_duration_ms: evalDuration,
      message_id: message.id,
    })
    .debug(`Strategy evaluation complete: ${name}`);

  if (!shouldRespond) return false;

  logger
    .withMetadata({ strategy_name: name, message_id: message.id })
    .info(`✓ STRATEGY MATCHED - Strategy: ${name}`);
  trackBotTriggerSafe(metrics, 'BlueBot', name, message);

  // Generate response
  const responseStartTime = Date.now();
  let response: string | null;
  try {
    response = await instance.getResponse();
  } catch (error) {
    logger
      .withError(error)
      .withMetadata({
        strategy_name: name,
        message_id: message.id,
        guild_id: message.guildId,
        channel_id: message.channelId,
      })
      .error(`Error generating/sending response: ${name}`);
    trackBotResponseSafe(metrics, 'BlueBot', message, 'error');
    return false;
  }

  const responseDuration = Date.now() - responseStartTime;

  if (!response) {
    logger
      .withMetadata({ strategy_name: name, message_id: message.id })
      .warn(`Strategy matched but returned empty response`);
    return false;
  }

  logger
    .withMetadata({
      strategy_name: name,
      response_length: response.length,
      response_generation_duration_ms: responseDuration,
      message_id: message.id,
    })
    .debug(`Response generated: ${name}`);

  if (!(message.channel instanceof TextChannel)) {
    logger
      .withMetadata({
        strategy_name: name,
        channel_type: message.channel.type,
        message_id: message.id,
      })
      .warn(`Cannot send response - not a text channel`);
    return false;
  }

  const sendStartTime = Date.now();
  await message.channel.send(response);
  const sendDuration = Date.now() - sendStartTime;
  const totalDuration = Date.now() - startTime;

  logger
    .withMetadata({
      strategy_name: name,
      response_preview: response.substring(0, 100),
      response_length: response.length,
      send_duration_ms: sendDuration,
      total_duration_ms: totalDuration,
      message_id: message.id,
      channel_id: message.channelId,
      guild_id: message.guildId,
    })
    .info(`✓ BOT RESPONSE SENT - Strategy: ${name}, Duration: ${totalDuration}ms`);

  trackBotResponseSafe(metrics, 'BlueBot', message, 'success', totalDuration);
  return true;
}
