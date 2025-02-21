import { Events, Message, TextChannel } from 'discord.js';
import DiscordClient from '../discord/discordClient';
import userID from '../discord/userID';
import webhookService from '../webhooks/webhookService';
import { link } from 'fs';

export default class SnowbunkClient extends DiscordClient {
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

  bootstrap() {
    this.on(Events.MessageCreate, async (message: Message) => {
      this.syncMessage(message);
    });
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
      embeds: [],
      token: this.token ?? ''
    });
  }
}
