import { Client } from 'discord.js';
import bluebot from './reply-bots/bluebot';
import { ReplyBot } from './reply-bots/ReplyBot';

const bots = new Map<string, ReplyBot>();

export default (client: Client): void => {
  const blubot = bluebot(client);
  bots.set(blubot.getBotName(), blubot);
};
