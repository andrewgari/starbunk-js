import { Collection, Events, Message, REST, Routes, TextChannel, WebhookMessageCreateOptions } from 'discord.js';
import { Command } from '../discord/command';
import ReplyBot from '../starbunk/bots/replyBot';
import DiscordClient from '../discord/discordClient';
import { loadModulesFromDirectory } from '../utils/moduleLoader';
import userID from '../discord/userID';
import webhookService from '../webhooks/webhookService';
import { link } from 'fs';

export default class SnowbunkClient extends DiscordClient {
  private readonly bots = new Collection<string, ReplyBot>();
  private readonly commands = new Collection<string, Command>();

  private readonly channelMap: Record<string, Array<string>> = {
    '757866614787014660': ['856617421942030364', '798613445301633137'],
    '856617421942030364': ['757866614787014660', '798613445301633137'], // testing
    '798613445301633137': ['757866614787014660', '856617421942030364'], // testing
    '755579237934694420': ['755585038388691127'], // starbunk
    '755585038388691127': ['755579237934694420'], // starbunk
    '753251583084724371': ['697341904873979925'], // memes
    '697341904873979925': ['753251583084724371'], // memes
    '754485972774944778': ['696906700627640352'], // ff14 general
    '696906700627640352': ['754485972774944778'], // ff14 general
    '697342576730177658': ['753251583084724372'], // ff14 msq
    '753251583084724372': ['697342576730177658'], // ff14 msq
    '753251583286050926': ['755575759753576498'], // screenshots
    '755575759753576498': ['753251583286050926'], // screenshots
    '753251583286050928': ['699048771308224642'], // raiding
    '699048771308224642': ['753251583286050928'], // raiding
    '696948268579553360': ['755578695011270707'], // food
    '755578695011270707': ['696948268579553360'], // food
    '696948305586028544': ['755578835122126898'], // pets
    '755578835122126898': ['696948305586028544'] // pets
  };

  getSyncedChannels(channelID: string): string[] {
    return this.channelMap[channelID] ?? [];
  }

  private async handleMessage(message: Message): Promise<void> {
    await Promise.all(
      Array.from(this.bots.values()).map(bot => bot.handleMessage(message))
    );
  }

  private async registerBots(): Promise<void> {
    const bots = await loadModulesFromDirectory<ReplyBot>('./src/snowbunk/bots/reply-bots');
    for (const bot of bots) {
      const botName = bot.getBotName();
      if (!botName || this.bots.has(botName)) continue;
      
      this.bots.set(botName, bot);
      console.log(`Registered Bot: ${botName}`);
    }
  }

  private async registerCommands(): Promise<void> {
    const commands = await loadModulesFromDirectory<Command>('./src/snowbunk/commands');
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
    
    this.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isCommand()) return;
      const command = this.commands.get(interaction.commandName);
      await command?.execute(interaction);
    });
  }

  async bootstrap(): Promise<void> {
    try {
      await Promise.all([
        this.registerBots(),
        this.registerCommands()
      ]);

      this.setupEventListeners();
    } catch (error) {
      console.error('Failed to bootstrap SnowbunkClient:', error);
      throw error;
    }
  }

  syncMessage = (message: Message) => {
    if (message.author.id === userID.Goose) return;
    if (message.author.bot) return;

    const linkedChannels = this.getSyncedChannels(message.channel.id);
    linkedChannels.forEach((channelID: string) => {
      this.channels
        .fetch(channelID)
        .then((channel) => {
          this.writeMessage(message, channel as TextChannel);
        })
        .catch((error) => {
          console.error(error);
        });
    });
  };

  writeMessage(message: Message, linkedChannel: TextChannel) {
    const userid = message.author.id;
    const displayName =
      linkedChannel.members.get(userid)?.displayName ??
      message.member?.displayName ??
      message.author.displayName;

    const avatarUrl =
      linkedChannel.members.get(userid)?.avatarURL() ??
      message.member?.avatarURL() ??
      message.author.defaultAvatarURL;

    webhookService.writeMessage(linkedChannel, {
      username: displayName,
      avatarURL: avatarUrl,
      content: message.content,
      embeds: []
    });
  }
}

export const getSnowbunkClient = (client: unknown): SnowbunkClient => {
  if (!(client instanceof SnowbunkClient)) {
    throw new Error('Client is not a SnowbunkClient');
  }
  return client;
};
