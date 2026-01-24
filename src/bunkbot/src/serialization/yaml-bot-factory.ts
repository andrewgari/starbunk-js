import { StandardReplyBot } from '@/reply-bots/standard-reply-bot';
import { Message } from 'discord.js';
import { botSchema } from '@/serialization/yaml-bot-parser';
import { z } from 'zod';
import { getBotIdentityFromDiscord } from '@/reply-bots/identity/get-bot-identity';
import { ConditionResolver } from '@/reply-bots/resolvers/condition-resolver';
import { logger } from '@/observability/logger';
import CommentConfigService from '@/reply-bots/services/comment-config-service';

export class YamlBotFactory {
  public createLiveBot(config: z.infer<typeof botSchema>): StandardReplyBot {
    logger.withMetadata({
      bot_name: config.name,
      identity_type: config.identity?.type,
      triggers_count: config.triggers.length,
      ignore_bots: config.ignore_bots,
      ignore_humans: config.ignore_humans,
    }).debug(`Creating bot from YAML config`);

    const identityResolver = async (message: Message) => {
      const id = config.identity;
      if (!id) {
        logger.withMetadata({
          bot_name: config.name,
        }).error('Identity config is required but not provided');
        throw new Error('Identity config is required');
      }

      if (id.type === 'static') {
        logger.withMetadata({
          bot_name: config.name,
          identity_name: id.botName,
        }).debug(`Using static identity`);
        return {
          botName: id.botName,
          avatarUrl: id.avatarUrl,
        };
      }

      if (id.type === 'mimic') {
        logger.withMetadata({
          bot_name: config.name,
          target_user_id: id.as_member,
        }).debug(`Resolving mimic identity`);
        const identity = await getBotIdentityFromDiscord({
          userId: id.as_member,
          fallbackName: config.name,
          message,
        });
        logger.withMetadata({
          bot_name: config.name,
          resolved_name: identity.botName,
        }).debug(`Mimic identity resolved`);
        return identity;
      }

      if (id.type === 'random') {
        logger.withMetadata({
          bot_name: config.name,
        }).debug(`Resolving random member identity`);
        const identity = await getBotIdentityFromDiscord({
          useRandomMember: true,
          fallbackName: config.name,
          message,
        });
        logger.withMetadata({
          bot_name: config.name,
          resolved_name: identity.botName,
        }).debug(`Random identity resolved`);
        return identity;
      }

      // This should never happen due to Zod validation, but TypeScript doesn't know that
      const unknownId = id as { type?: string };
      logger.withMetadata({
        bot_name: config.name,
        identity_type: unknownId.type ?? 'unknown',
      }).error('Unknown identity type');
      throw new Error(`Unknown identity type: ${unknownId.type ?? 'unknown'}`);
    }

    const triggers = config.triggers.map((trigger) => {
      logger.withMetadata({
        bot_name: config.name,
        trigger_name: trigger.name,
        has_responses: !!(trigger.responses || config.responses),
      }).debug(`Creating trigger`);

      const resolved = ConditionResolver.resolveWithMetadata(trigger.conditions);

      return {
        name: trigger.name,
        condition: resolved.condition,
        metadata: resolved.metadata,
        responseGenerator: () => {
          const override = CommentConfigService.getInstance().getComments(config.name);
          const pool = (override && override.length > 0) ? override : (trigger.responses || config.responses);
          if (!pool) {
            logger.withMetadata({
              bot_name: config.name,
              trigger_name: trigger.name,
            }).error('No responses configured for trigger');
            throw new Error(`No responses configured for trigger ${trigger.name || 'unnamed'}`);
          }
          const list = Array.isArray(pool) ? pool : [pool];
          const selected = list[Math.floor(Math.random() * list.length)];

          logger.withMetadata({
            bot_name: config.name,
            trigger_name: trigger.name,
            pool_size: list.length,
            response_length: selected.length,
          }).debug(`Response selected`);

          return selected;
        }
      };
    });

    logger.withMetadata({
      bot_name: config.name,
      triggers_count: triggers.length,
      identity_type: config.identity?.type,
    }).info(`Bot created successfully`);

    return new StandardReplyBot(
      config.name,
      identityResolver,
      triggers,
      config.ignore_bots,
      config.ignore_humans,
    );
  }
}
