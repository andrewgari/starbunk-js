import ReplyBot from './ReplyBot';
import Client from '../discord/DiscordClient';
import { readdirSync } from 'fs';
import { Events, Message, REST, Routes } from 'discord.js';

const registerBots = async (client: Client) => {
  readdirSync(`./src/bots/reply-bots`).forEach(async (file) => {
    const fileName = file.replace('.ts', '');
    await import(`./reply-bots/${fileName}`).then((botClass) => {
      if (!botClass) return;
      const bot = new botClass.default(client) as ReplyBot;
      if (
        !bot ||
        !bot.getBotName() ||
        client.bots.find((b) => b.getBotName() === bot.getBotName())
      )
        return;
      client.bots.set(bot.getBotName(), bot);
      client.on(Events.MessageCreate, async (message: Message) => {
        bot.handleMessage(message);
      });
      console.log(`Registered Bot: ${bot.getBotName()}`);
    });
  });
};

const registerCommands = async (
  client: Client,
  clientId: string,
  guildId: string
) => {
  readdirSync(`./src/commands/`).forEach(async (file) => {
    const fileName = file.replace('.ts', '');
    await import(`../commands/${fileName}`).then((cmd) => {
      const command = cmd.default;
      if (
        !command ||
        !command?.data?.name ||
        client.commands.find((c) => c.data.name === command.data.name)
      )
        return;
      client.commands.set(command.data.name, command);
      console.log(`Registered Command: ${command.data.name}`);
    });
  });
  console.log('creating rest client');
  const rest = new REST({ version: '10' }).setToken(client.token!);
  console.log('created rest client');

  try {
    console.log('Registering slash commands');
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: client.commands
    });
    console.log('Registered Commands');
  } catch (e) {
    console.error(e);
  }

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    interaction.reply('Got it');
  });
};

export default async (
  client: Client,
  clientId: string,
  guildId: string
): Promise<void> => {
  await registerBots(client);
  await registerCommands(client, clientId, guildId);
};
