import {
  Collection,
  Events,
  Message,
  REST,
  Routes,
  VoiceState
} from 'discord.js';
import { Command } from '../discord/command';
import ReplyBot from './bots/replyBot';
import DiscordClient from '../discord/discordClient';
import VoiceBot from './bots/voiceBot';
import { DJCova } from './dJCova';
import { PlayerSubscription } from '@discordjs/voice';
import { loadModulesFromDirectory } from '../utils/moduleLoader';

export default class StarbunkClient extends DiscordClient {
  private readonly bots = new Collection<string, ReplyBot>();
  private readonly voiceBots = new Collection<string, VoiceBot>();
  private readonly commands = new Collection<string, Command>();
  private readonly djCova = new DJCova();
  private activeSubscription?: PlayerSubscription;

  getMusicPlayer(): DJCova {
    return this.djCova;
  }

  private async handleMessage(message: Message): Promise<void> {
    await Promise.all(
      Array.from(this.bots.values()).map(bot => bot.handleMessage(message))
    );
  }

  private async handleVoiceEvent(oldState: VoiceState, newState: VoiceState): Promise<void> {
    await Promise.all(
      Array.from(this.voiceBots.values()).map(bot => bot.handleEvent(oldState, newState))
    );
  }

  private async registerBots(): Promise<void> {
    const bots = await loadModulesFromDirectory<ReplyBot>('./src/starbunk/bots/reply-bots');
    for (const bot of bots) {
      const botName = bot.name; // Access public name property instead of protected getBotName()
      if (!botName || this.bots.has(botName)) continue;
      
      this.bots.set(botName, bot);
      console.log(`Registered Bot: ${botName}`);
    }
  }

  private async registerVoiceBots(): Promise<void> {
    const voiceBots = await loadModulesFromDirectory<VoiceBot>('./src/starbunk/bots/voice-bots');
    for (const bot of voiceBots) {
      const botName = bot.getBotName();
      if (!botName || this.voiceBots.has(botName)) continue;
      
      this.voiceBots.set(botName, bot);
      console.log(`Registered Voice Bot: ${botName}`);
    }
  }

  private async registerCommands(): Promise<void> {
    const commands = await loadModulesFromDirectory<Command>('./src/starbunk/commands');
    for (const command of commands) {
      const commandName = command.data?.name;
      if (!commandName || this.commands.has(commandName)) continue;
      
      this.commands.set(commandName, command);
      console.log(`Registered Command: ${commandName}`);
    }
  }

  private setupEventListeners(): void {
    this.on(Events.MessageCreate, this.handleMessage.bind(this));
    
    this.on(Events.MessageUpdate, async (_oldMessage, newMessage) => {
      const message = await newMessage.fetch();
      await this.handleMessage(message);
    });
    
    this.on(Events.VoiceStateUpdate, this.handleVoiceEvent.bind(this));
    
    this.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isCommand()) return;
      const command = this.commands.get(interaction.commandName);
      await command?.execute(interaction);
    });
  }

  async bootstrap(token: string, clientId: string, guildId: string): Promise<void> {
    const rest = new REST({ version: '9' }).setToken(token);

    try {
      await Promise.all([
        this.registerBots(),
        this.registerCommands(),
        this.registerVoiceBots()
      ]);

      await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: Array.from(this.commands.values()).map(command => command.data)
      });

      this.setupEventListeners();
    } catch (error) {
      console.error('Failed to bootstrap StarbunkClient:', error);
      throw error;
    }
  }
}

export const getStarbunkClient = (client: unknown): StarbunkClient => {
  if (!(client instanceof StarbunkClient)) {
    throw new Error('Client is not a StarbunkClient');
  }
  return client;
};