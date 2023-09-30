import { Client } from 'discord.js';
import { ReplyBot } from './ReplyBot';
import BlueBot from './reply-bots/Bluebot';
import Botbot from './reply-bots/Botbot';
import MacaroniBot from './reply-bots/MacaroniBot';

const bots = new Map<string, ReplyBot>();

export const registerBot = (bot: ReplyBot) => {
  bots.set(bot.getBotName(), bot);
};

export default (client: Client): void => {
  registerBot(new BlueBot(client));
  registerBot(new Botbot(client));
  registerBot(new MacaroniBot(client));
};
