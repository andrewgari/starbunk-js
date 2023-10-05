import ReplyBot from './bots/ReplyBot';
import Client from './discord/DiscordClient';
import { readdirSync } from 'fs';
import { Events, Message, REST, Routes } from 'discord.js';

const registerBots = async (client: Client) => {
  readdirSync(`./src/bots/reply-bots`).forEach(async (file) => {
    const fileName = file.replace('.ts', '');
    await import(`./bots/reply-bots/${fileName}`).then((botClass) => {
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

const registerCommands = async (client: Client) => {
  readdirSync(`./src/commands/`).forEach(async (file) => {
    const fileName = file.replace('.ts', '');
    await import(`./commands/${fileName}`).then((cmd) => {
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
};

export default async (
  client: Client,
  token: string,
  clientId: string,
  guildId: string
) => {
  const rest = new REST({ version: '9' }).setToken(token);
  const promises = [registerBots(client), registerCommands(client)];
  Promise.all(promises)
    .then(() => {
      return rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: client.commands.map((command) => command.data)
      });
    })
    .then(() => console.log('registered the commands'))
    .catch(console.error)
    .finally(() => {
      client.on(Events.InteractionCreate, async (interaction) => {
        if (!interaction.isCommand()) return;
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        command.execute(interaction);
      });
    });
};
