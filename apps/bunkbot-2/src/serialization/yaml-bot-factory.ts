import { StandardReplyBot } from "@/reply-bots/models/standard-reply-bot";
import { Message } from "discord.js";
import { botSchema } from "@/serialization/yaml-bot-parser";
import { z } from "zod";
import { getBotIdentityFromDiscord } from "@/reply-bots/identity/get-bot-identity";
import { ConditionResolver } from "@/reply-bots/conditions/condition-resolver";
export class YamlBotFactory {
  public createLiveBot(config: z.infer<typeof botSchema>): StandardReplyBot {
    const identityResolver = async (message: Message) => {
      const id = config.identity;
      if(!id) {
        throw new Error('Identity config is required');
      }

      if (id.type === 'static') {
        return {
          botName: id.botName,
          avatarUrl: id.avatarUrl,
        };
      }

      if (id.type === 'mimic') {
        return await getBotIdentityFromDiscord({
          userId: id.as_member,
          fallbackName: config.name,
          message,
        });
      }

      if (id.type === 'random') {
        return await getBotIdentityFromDiscord({
          useRandomMember: true,
          fallbackName: config.name,
          message,
        });
      }

      throw new Error(`Unknown identity type`);
    }

    const triggers = config.triggers.map((trigger) => ({
      name: trigger.name,
      condition: ConditionResolver.resolve(trigger.conditions),
      responseGenerator: () => {
        const pool = trigger.responses || config.responses;
        if (!pool) {
          throw new Error(`No responses configured for trigger ${trigger.name || 'unnamed'}`);
        }
        const list = Array.isArray(pool) ? pool : [pool];
        return list[Math.floor(Math.random() * list.length)];
      }
    }));

    return new StandardReplyBot(
      config.name,
      identityResolver,
      triggers,
      config.ignore_bots,
      config.ignore_humans,
    );
  }
}
