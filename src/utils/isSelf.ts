import { Message } from 'discord.js';

export default (message: Message, botName: String): boolean => {
  return message.author.bot && message.author.username === botName;
};
