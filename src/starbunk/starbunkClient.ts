import {
  ClientOptions,
  Collection,
  Events,
  Message,
  REST,
  Routes
} from 'discord.js';
import { Command } from '../discord/command';
import ReplyBot from './bots/replyBot';
import { readdirSync } from 'fs';
import DiscordClient from '../discord/discordClient';

export default class StarbunkClient extends DiscordClient {
  bots: Collection<string, ReplyBot> = new Collection();
  commands: Collection<string, Command> = new Collection();

  constructor(options: ClientOptions) {
    super(options);
  }

  handleMessage = (message: Message) => {
    this.bots.forEach((bot: ReplyBot) => {
      bot.handleMessage(message);
    });
  };

  registerBots = async () => {
    readdirSync(`./src/starbunk/bots/reply-bots`).forEach(async (file) => {
      const fileName = file.replace('.ts', '');
      await import(`./bots/reply-bots/${fileName}`).then((botClass) => {
        if (!botClass) return;
        const bot = new botClass.default(this) as ReplyBot;
        if (
          !bot ||
          !bot.getBotName() ||
          this.bots.find((b) => b.getBotName() === bot.getBotName())
        )
          return;
        this.bots.set(bot.getBotName(), bot);
        console.log(`Registered Bot: ${bot.getBotName()}`);
      });
    });
  };

  registerCommands = async () => {
    readdirSync(`./src/starbunk/commands/`).forEach(async (file) => {
      const fileName = file.replace('.ts', '');
      await import(`./commands/${fileName}`).then((cmd) => {
        const command = cmd.default;
        if (
          !command ||
          !command?.data?.name ||
          this.commands.find((c) => c.data.name === command.data.name)
        )
          return;
        this.commands.set(command.data.name, command);
        console.log(`Registered Command: ${command.data.name}`);
      });
    });
  };

  bootstrap(token: string, clientId: string, guildId: string): void {
    const rest = new REST({ version: '9' }).setToken(token);
    const promises = [this.registerBots(), this.registerCommands()];
    Promise.all(promises)
      .then(() => {
        this.on(Events.MessageCreate, async (message: Message) => {
          this.handleMessage(message);
        });
      })
      .then(() => {
        console.log('routing commands');
        return rest.put(Routes.applicationGuildCommands(clientId, guildId), {
          body: this.commands.map((command) => command.data)
        });
      })
      .catch(console.error)
      .finally(() => {
        console.log('listening on commands');
        this.on(Events.InteractionCreate, async (interaction) => {
          console.log('got command');
          if (!interaction.isCommand()) return;
          const command = this.commands.get(interaction.commandName);
          if (!command) return;
          command.execute(interaction);
        });
      });
  }
}
