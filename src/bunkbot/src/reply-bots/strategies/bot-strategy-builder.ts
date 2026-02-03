import { Message } from 'discord.js';
import { z } from 'zod';
import { botSchema } from '@/serialization/yaml-bot-parser';
import { getBotIdentityFromDiscord } from '@/reply-bots/identity/get-bot-identity';
import { ConditionResolver } from '@/reply-bots/resolvers/condition-resolver';
import { logger } from '@/observability/logger';
import CommentConfigService from '@/reply-bots/services/comment-config-service';
import { BotConfigStrategy } from '@/reply-bots/strategies/bot-config-strategy';
import { SendWebhookMessageStrategy } from '@starbunk/shared/strategy/send-webhook-message-strategy';
import type { BotIdentity } from '@starbunk/shared/types/bot-identity';
import type { Trigger } from '@/reply-bots/conditions/trigger';

/**
 * Builder for creating SendWebhookMessageStrategy instances from bot configs
 * Encapsulates the factory logic for building strategies from YAML configurations
 */
export class BotStrategyBuilder {
  /**
   * Build a single strategy from a bot config
   */
  static buildFromConfig(config: z.infer<typeof botSchema>): SendWebhookMessageStrategy {
    logger
      .withMetadata({
        bot_name: config.name,
        identity_type: config.identity?.type,
        triggers_count: config.triggers.length,
        ignore_bots: config.ignore_bots,
        ignore_humans: config.ignore_humans,
      })
      .debug(`Building strategy from bot config`);

    // Resolve identity
    const identityResolver = this.createIdentityResolver(config);

    // Build triggers
    const triggers = this.createTriggers(config);

    // Create and return strategy
    const strategy = new BotConfigStrategy(
      config.name,
      identityResolver,
      triggers,
      config.ignore_bots,
      config.ignore_humans,
    );

    logger
      .withMetadata({
        bot_name: config.name,
        triggers_count: triggers.length,
        strategy_name: strategy.name,
      })
      .info(`Strategy created successfully`);

    return strategy;
  }

  /**
   * Build multiple strategies from multiple bot configs
   */
  static buildAllFromConfigs(configs: z.infer<typeof botSchema>[]): SendWebhookMessageStrategy[] {
    logger
      .withMetadata({
        total_configs: configs.length,
        config_names: configs.map(c => c.name).join(', '),
      })
      .info(`Building strategy pool from ${configs.length} configs`);

    const strategies = configs.map(config => this.buildFromConfig(config));

    logger
      .withMetadata({
        total_strategies: strategies.length,
        strategy_names: strategies.map(s => s.name).join(', '),
      })
      .info(`Strategy pool created successfully`);

    return strategies;
  }

  /**
   * Create an identity resolver function for the bot
   */
  private static createIdentityResolver(
    config: z.infer<typeof botSchema>,
  ): (message: Message) => Promise<BotIdentity> {
    return async (message: Message): Promise<BotIdentity> => {
      const id = config.identity;
      if (!id) {
        logger
          .withMetadata({
            bot_name: config.name,
          })
          .error('Identity config is required but not provided');
        throw new Error('Identity config is required');
      }

      if (id.type === 'static') {
        logger
          .withMetadata({
            bot_name: config.name,
            identity_name: id.botName,
          })
          .debug(`Using static identity`);
        return {
          botName: id.botName,
          avatarUrl: id.avatarUrl,
        };
      }

      if (id.type === 'mimic') {
        logger
          .withMetadata({
            bot_name: config.name,
            target_user_id: id.as_member,
          })
          .debug(`Resolving mimic identity`);
        const identity = await getBotIdentityFromDiscord({
          userId: id.as_member,
          fallbackName: config.name,
          message,
        });
        logger
          .withMetadata({
            bot_name: config.name,
            resolved_name: identity.botName,
          })
          .debug(`Mimic identity resolved`);
        return identity;
      }

      if (id.type === 'random') {
        logger
          .withMetadata({
            bot_name: config.name,
          })
          .debug(`Resolving random member identity`);
        const identity = await getBotIdentityFromDiscord({
          useRandomMember: true,
          fallbackName: config.name,
          message,
        });
        logger
          .withMetadata({
            bot_name: config.name,
            resolved_name: identity.botName,
          })
          .debug(`Random identity resolved`);
        return identity;
      }

      // This should never happen due to Zod validation, but TypeScript doesn't know that
      const unknownId = id as { type?: string };
      logger
        .withMetadata({
          bot_name: config.name,
          identity_type: unknownId.type ?? 'unknown',
        })
        .error('Unknown identity type');
      throw new Error(`Unknown identity type: ${unknownId.type ?? 'unknown'}`);
    };
  }

  /**
   * Create trigger objects from config triggers
   */
  private static createTriggers(config: z.infer<typeof botSchema>): Trigger[] {
    return config.triggers.map(trigger => {
      logger
        .withMetadata({
          bot_name: config.name,
          trigger_name: trigger.name,
          has_responses: !!(trigger.responses || config.responses),
        })
        .debug(`Creating trigger`);

      const resolved = ConditionResolver.resolveWithMetadata(trigger.conditions, config.name);

      return {
        name: trigger.name,
        condition: resolved.condition,
        metadata: resolved.metadata,
        responseGenerator: (_message: Message) => {
          const override = CommentConfigService.getInstance().getComments(config.name);
          const pool =
            override && override.length > 0 ? override : trigger.responses || config.responses;
          if (!pool) {
            logger
              .withMetadata({
                bot_name: config.name,
                trigger_name: trigger.name,
              })
              .error('No responses configured for trigger');
            throw new Error(`No responses configured for trigger ${trigger.name || 'unnamed'}`);
          }
          const list = Array.isArray(pool) ? pool : [pool];
          const selected = list[Math.floor(Math.random() * list.length)];

          logger
            .withMetadata({
              bot_name: config.name,
              trigger_name: trigger.name,
              pool_size: list.length,
              response_length: selected.length,
            })
            .debug(`Response selected`);

          return selected;
        },
      } as Trigger;
    });
  }
}
