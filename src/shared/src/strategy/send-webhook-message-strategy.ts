import { Message } from 'discord.js';
import type { BotIdentity } from '../types/bot-identity';
import { DiscordService } from '../discord/discord-service';
import { BotStrategy } from './bot-strategy';
import { logLayer } from '@/observability/log-layer';

export abstract class SendWebhookMessageStrategy extends BotStrategy<Message> {
  abstract readonly name: string;
  abstract readonly priority: number;
  protected abstract readonly identity: BotIdentity | ((message: Message) => Promise<BotIdentity>);
  abstract getResponse(): Promise<string>;
  abstract resolveBotIdentity(message: Message): Promise<BotIdentity>;

  async execute(message: Message): Promise<boolean> {
    try {
      const identity = await this.resolveBotIdentity(message);
      await DiscordService.getInstance().sendMessageWithBotIdentity(
        message,
        identity,
        await this.getResponse(),
      );
      return true;
    } catch (error) {
      logLayer.error(`[${this.name}] Error sending message with bot identity: ${error}`);
      return false;
    }
  }
}
