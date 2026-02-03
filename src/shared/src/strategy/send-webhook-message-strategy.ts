import { Message } from 'discord.js';
import type { BotIdentity } from '../types/bot-identity';
import { DiscordService } from '../discord/discord-service';
import { BotStrategy } from './bot-strategy';
import { logger } from '../observability/logger';

export abstract class SendWebhookMessageStrategy extends BotStrategy<Message> {
  abstract readonly name: string;
  abstract readonly priority: number;
  protected abstract readonly identity: BotIdentity | ((message: Message) => Promise<BotIdentity>);
  abstract getResponse(context: Message): Promise<string>;
  abstract resolveBotIdentity(message: Message): Promise<BotIdentity>;

  async execute(message: Message): Promise<boolean> {
    try {
      const identity = await this.resolveBotIdentity(message);
      await DiscordService.getInstance().sendMessageWithBotIdentity(
        message,
        identity,
        await this.getResponse(message),
      );
      return true;
    } catch (error) {
      logger
        .withError(error)
        .withMetadata({ strategy_name: this.name, message_id: message.id })
        .error('Error sending message with bot identity');
      return false;
    }
  }
}
