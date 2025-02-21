import { PlayerSubscription } from '@discordjs/voice';
import {
  Base,
  ClientOptions,
  Collection,
  Events,
  Interaction,
  Message,
  REST,
  Routes,
  VoiceState
} from 'discord.js';
import { readdirSync } from 'fs';

import { ReplyBot } from '../discord/bots/replyBot';
import { Command } from '../discord/command';
import { DiscordClient, DiscordConfig } from '../discord/discordClient';
import { DJCova } from './dJCova';
import { BotRegistry } from '../discord/services/botRegistry';
import { MessageBot, VoiceBot } from '../discord/bots/types';

export default class StarbunkClient extends DiscordClient {
  private readonly replyBots = new BotRegistry<MessageBot>();
  private readonly voiceBots = new BotRegistry<VoiceBot>();
  commands: Collection<string, Command> = new Collection();
  djCova: DJCova = new DJCova();
  activeSubscription: PlayerSubscription | undefined;

  getMusicPlayer = (): DJCova => {
    return this.djCova;
  };

  constructor(options: ClientOptions) {
    const config: DiscordConfig = {
      token: process.env.STARBUNK_TOKEN ?? '',
      clientId: process.env.CLIENT_ID ?? '',
      guildId: process.env.GUILD_ID ?? ''
    };
    super(options, config);
  }

  handleMessage = (message: Message) => {
    this.replyBots.getAllBots().forEach((bot: MessageBot) => {
      if (bot.canHandle(message)) {
        bot.handle(message);
      }
    });
  };

  handleVoiceEvent = (oldState: VoiceState, newState: VoiceState) => {
    this.voiceBots.getAllBots().forEach((bot: VoiceBot) => {
      bot.handleEvent(oldState, newState);
    });
  };

  registerBots = async () => {
    for (const file of readdirSync('./src/starbunk/bots/reply-bots')) {
      const fileName = file.replace('.ts', '');
      await import(`./bots/reply-bots/${fileName}`).then((botClass) => {
        if (!botClass) return;
        const bot = new botClass.default(this) as ReplyBot;
        if (!bot || !bot.getName() || this.replyBots.getBot(bot.getName())) {
          return;
        }
        this.replyBots.registerBot(bot);
        console.log(`Registered Bot: ${bot.getName()}`);
      });
    }
  };

  registerVoiceBots = async () => {
    for (const file of readdirSync('./src/starbunk/bots/voice-bots')) {
      const fileName = file.replace('.ts', '');
      await import(`./bots/voice-bots/${fileName}`).then((botClass) => {
        if (!botClass) return;
        const bot = new botClass.default(this) as VoiceBot;
        if (!bot || !bot.getName() || this.replyBots.getBot(bot.getName())) {
          return;
        }
        this.voiceBots.registerBot(bot);
        console.log(`Registered Voice Bot: ${bot.getName()}`);
      });
    }
  };

  registerCommands = async () => {
    for (const file of readdirSync('./src/starbunk/commands/')) {
      const fileName = file.replace('.ts', '');
      await import(`./commands/${fileName}`).then((cmd) => {
        const command = cmd.default;
        if (
          !command ||
          !command?.data?.name ||
          this.commands.find((c) => c.data.name === command.data.name)
        ) {
          return;
        }
        this.commands.set(command.data.name, command);
        console.log(`Registered Command: ${command.data.name}`);
      });
    }
  };

  bootstrap(token: string, clientId: string, guildId: string): Promise<void> {
    const rest = new REST({ version: '9' }).setToken(token);
    const promises = [
      this.registerBots(),
      this.registerCommands(),
      this.registerVoiceBots()
    ];

    return Promise.all(promises).then(() => {
      console.log('routing commands');
      rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: this.commands.map((command) => command.data)
      });

      this.on(Events.MessageCreate, async (message: Message) => {
        this.handleMessage(message);
      });

      this.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
        const message = await newMessage.fetch();
        this.handleMessage(message);
      });

      console.log('registering voice bots');
      this.on(
        Events.VoiceStateUpdate,
        async (oldState: VoiceState, newState: VoiceState) => {
          console.log('on voice event');
          this.handleVoiceEvent(oldState, newState);
        }
      );

      console.log('listening on commands');
      this.on(Events.InteractionCreate, async (interaction: Interaction) => {
        console.log('got command');
        if (!interaction.isCommand()) return;
        const command = this.commands.get(interaction.commandName);
        if (!command) return;
        command.execute(interaction);
      });
    });
  }
}

export const getStarbunkClient = (base: Base) => {
  return base.client as StarbunkClient;
};
