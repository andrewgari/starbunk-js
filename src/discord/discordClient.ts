import Discord, { ClientOptions, Collection } from 'discord.js';
import { Command } from './command';
import ReplyBot from '../bots/replyBot';

export default class Client extends Discord.Client {
  bots: Collection<string, ReplyBot> = new Collection();
  commands: Collection<string, Command> = new Collection();

  constructor(options: ClientOptions) {
    super(options);
  }
}
