import { Message } from 'discord.js';
import { Trigger } from '@/reply-bots/conditions/trigger';
import { BotIdentity } from '@/reply-bots/models/bot-identity';

export interface ReplyBot {
  name: string;
  ignore_bots: boolean;
  ignore_humans: boolean;

  // A function that resolves who the bot "is" for a specific message
  // This handles Scenario 1 (Static), 2 (Mimic), and 3 (Random)
  identity: BotIdentity | ((message: Message) => Promise<BotIdentity>);

  // The list of rules the bot follows
  triggers: Trigger[];

  // The method called by the Registry
  handleMessage(message: Message): Promise<void>;
}
