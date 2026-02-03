import { Message } from 'discord.js';
import { SendWebhookMessageStrategy } from '@starbunk/shared/strategy/send-webhook-message-strategy';
import type { BotIdentity } from '@starbunk/shared/types/bot-identity';
import { logger } from '@/observability/logger';
import { ResponseResolver } from '@/reply-bots/resolvers/response-resolver';
import type { Trigger } from '@/reply-bots/conditions/trigger';

/**
 * Strategy implementation that executes bot configuration logic
 * Wraps trigger evaluation and response generation
 */
export class BotConfigStrategy extends SendWebhookMessageStrategy {
  readonly name: string;
  readonly priority: number = 100; // Default priority
  protected readonly identity: BotIdentity | ((message: Message) => Promise<BotIdentity>);
  private readonly triggers: Trigger[];
  private readonly ignoreBots: boolean;
  private readonly ignoreHumans: boolean;

  constructor(
    name: string,
    identity: BotIdentity | ((message: Message) => Promise<BotIdentity>),
    triggers: Trigger[],
    ignoreBots: boolean = true,
    ignoreHumans: boolean = false,
  ) {
    super();
    this.name = name;
    this.identity = identity;
    this.triggers = triggers;
    this.ignoreBots = ignoreBots;
    this.ignoreHumans = ignoreHumans;
  }

  /**
   * Determine if this strategy should trigger for the given message
   */
  async shouldTrigger(message: Message): Promise<boolean> {
    // Filter by author type (bot vs human)
    if (this.ignoreBots && message.author.bot) {
      logger
        .withMetadata({
          bot_name: this.name,
          message_id: message.id,
          author_id: message.author.id,
        })
        .debug('Skipping bot message (ignoreBots=true)');
      return false;
    }

    if (this.ignoreHumans && !message.author.bot) {
      logger
        .withMetadata({
          bot_name: this.name,
          message_id: message.id,
          author_id: message.author.id,
        })
        .debug('Skipping human message (ignoreHumans=true)');
      return false;
    }

    // Evaluate triggers
    for (const trigger of this.triggers) {
      try {
        const triggerName = trigger.name || 'unnamed';
        const conditionMet = await trigger.condition(message);

        if (conditionMet) {
          logger
            .withMetadata({
              bot_name: this.name,
              trigger_name: triggerName,
              message_id: message.id,
            })
            .debug('Trigger condition met');
          return true;
        }
      } catch (error) {
        logger
          .withError(error)
          .withMetadata({
            bot_name: this.name,
            trigger_name: trigger.name || 'unnamed',
            message_id: message.id,
          })
          .error('Error evaluating trigger condition');
      }
    }

    return false;
  }

  /**
   * Generate response for the message
   */
  async getResponse(message: Message): Promise<string> {
    // Find the first matching trigger and generate its response
    for (const trigger of this.triggers) {
      try {
        const conditionMet = await trigger.condition(message);
        if (conditionMet) {
          const response = trigger.responseGenerator(message);
          const resolved = await ResponseResolver.resolve(response, message);
          return resolved;
        }
      } catch (error) {
        logger
          .withError(error)
          .withMetadata({
            bot_name: this.name,
            trigger_name: trigger.name || 'unnamed',
            message_id: message.id,
          })
          .error('Error generating response');
      }
    }

    throw new Error(`No matching trigger found for bot ${this.name}`);
  }

  /**
   * Get the bot identity for this message
   */
  async resolveBotIdentity(message: Message): Promise<BotIdentity> {
    if (typeof this.identity === 'function') {
      return this.identity(message);
    }
    return this.identity;
  }
}
