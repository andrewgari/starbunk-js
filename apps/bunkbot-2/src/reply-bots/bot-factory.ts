import { getBotIdentityFromDiscord } from "@/reply-bots/identity/get-bot-identity";
import { botSchema } from "@/serialization/yaml-bot-parser";
import { Message } from "discord.js";
import { z } from "zod";
export class BotFactory {
  async resolveIdentity(config: z.infer<typeof botSchema>, message: Message) {
    const identity = config.identity;
    if(!identity) {
      throw new Error('Identity config is required');
    }

    if (config.identity.type === 'random') {
      return await getBotIdentityFromDiscord({
        useRandomMember: true,
        fallbackName: config.name,
        message,
      });
    }

    if (config.identity.type === 'mimic') {
      return await getBotIdentityFromDiscord({
        userId: config.identity.as_member,
        fallbackName: config.name,
        message,
      });
    }

    if (config.identity.type === 'static') {
      return {
        botName: config.identity.botName,
        avatarUrl: config.identity.avatarUrl,
      };
    }
  }
}
