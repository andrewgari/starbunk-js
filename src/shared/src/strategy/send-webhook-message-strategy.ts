import { Message } from 'discord.js';
import type { BotIdentity } from '@/types/bot-identity';
import { DiscordService } from '@/discord/discord-service';
import { BotStrategy } from './bot-strategy';

export abstract class SendWebhookMessageStrategy extends BotStrategy<Message> {
  abstract readonly name: string;
  abstract readonly priority: number;
  protected abstract readonly identity: BotIdentity;
  abstract getResponse(context: Message): Promise<string>;

  async execute(message: Message): Promise<boolean> {
    try {
      await DiscordService.getInstance().sendMessageWithBotIdentity(
        message,
        this.identity,
        await this.getResponse(message),
      );
      return true;
    } catch (error) {
      console.error(`Error sending message with identity: ${error}`);
      return false;
    }
  }
}
