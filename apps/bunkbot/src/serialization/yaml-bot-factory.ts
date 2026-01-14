import { StandardReplyBot } from "@/reply-bots/models/standard-reply-bot";
import { Message } from "discord.js";
import { botSchema } from "@/serialization/yaml-bot-parser";
import { z } from "zod";
import { getBotIdentityFromDiscord } from "@/reply-bots/identity/get-bot-identity";
import { ConditionResolver } from "@/reply-bots/conditions/condition-resolver";
import { logger } from "@/observability/logger";

export class YamlBotFactory {
  public createLiveBot(config: z.infer<typeof botSchema>): StandardReplyBot {
    logger.debug(`Creating bot from YAML config`, {
      bot_name: config.name,
      identity_type: config.identity?.type,
      triggers_count: config.triggers.length,
      ignore_bots: config.ignore_bots,
      ignore_humans: config.ignore_humans,
    });

    const identityResolver = async (message: Message) => {
      const id = config.identity;
      if(!id) {
        logger.error('Identity config is required but not provided', undefined, {
          bot_name: config.name,
        });
        throw new Error('Identity config is required');
      }

      if (id.type === 'static') {
        logger.debug(`Using static identity`, {
          bot_name: config.name,
          identity_name: id.botName,
        });
        return {
          botName: id.botName,
          avatarUrl: id.avatarUrl,
        };
      }

      if (id.type === 'mimic') {
        logger.debug(`Resolving mimic identity`, {
          bot_name: config.name,
          target_user_id: id.as_member,
        });
        const identity = await getBotIdentityFromDiscord({
          userId: id.as_member,
          fallbackName: config.name,
          message,
        });
        logger.debug(`Mimic identity resolved`, {
          bot_name: config.name,
          resolved_name: identity.botName,
        });
        return identity;
      }

      if (id.type === 'random') {
        logger.debug(`Resolving random member identity`, {
          bot_name: config.name,
        });
        const identity = await getBotIdentityFromDiscord({
          useRandomMember: true,
          fallbackName: config.name,
          message,
        });
        logger.debug(`Random identity resolved`, {
          bot_name: config.name,
          resolved_name: identity.botName,
        });
        return identity;
      }

      // This should never happen due to Zod validation, but TypeScript doesn't know that
      const unknownId = id as { type?: string };
      logger.error('Unknown identity type', undefined, {
        bot_name: config.name,
        identity_type: unknownId.type ?? 'unknown',
      });
      throw new Error(`Unknown identity type: ${unknownId.type ?? 'unknown'}`);
    }

    const triggers = config.triggers.map((trigger) => {
      logger.debug(`Creating trigger`, {
        bot_name: config.name,
        trigger_name: trigger.name,
        has_responses: !!(trigger.responses || config.responses),
      });

      return {
        name: trigger.name,
        condition: ConditionResolver.resolve(trigger.conditions),
        responseGenerator: () => {
          const pool = trigger.responses || config.responses;
          if (!pool) {
            logger.error('No responses configured for trigger', undefined, {
              bot_name: config.name,
              trigger_name: trigger.name,
            });
            throw new Error(`No responses configured for trigger ${trigger.name || 'unnamed'}`);
          }
          const list = Array.isArray(pool) ? pool : [pool];
          const selected = list[Math.floor(Math.random() * list.length)];

          logger.debug(`Response selected`, {
            bot_name: config.name,
            trigger_name: trigger.name,
            pool_size: list.length,
            response_length: selected.length,
          });

          return selected;
        }
      };
    });

    logger.info(`Bot created successfully`, {
      bot_name: config.name,
      triggers_count: triggers.length,
      identity_type: config.identity?.type,
    });

    return new StandardReplyBot(
      config.name,
      identityResolver,
      triggers,
      config.ignore_bots,
      config.ignore_humans,
    );
  }
}
