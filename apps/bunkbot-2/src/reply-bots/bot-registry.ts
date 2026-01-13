import { ReplyBot } from "./reply-bot";
import { Message } from 'discord.js';
export class BotRegistry {
  private bots: Map<string, ReplyBot> = new Map();

  public register(bot: ReplyBot) {
    if (this.bots.has(bot.name)) {
      console.warn(`Bot with name ${bot.name} already exists, skipping registration`);
    }

    this.bots.set(bot.name, bot);
    console.log(`[Registry] ${bot.name} is now online.`);
  }

  public async processmessage(message: Message) {
    for (const bot of this.bots.values()) {
      if (bot.ignore_bots && message.author.bot) continue;
      if (bot.ignore_humans && !message.author.bot) continue;

      await bot.handleMessage(message);
    }
  }
}
