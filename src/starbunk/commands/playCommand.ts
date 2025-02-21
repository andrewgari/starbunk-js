import { CommandInteraction, GuildMember, PermissionFlagsBits, VoiceChannel } from 'discord.js';
import { BaseCommand } from '../../discord/baseCommand';
import { CommandData } from '../../discord/command';
import { getStarbunkClient } from '../starbunkClient';

export default class PlayCommand extends BaseCommand {
  readonly data: CommandData = {
    name: 'play',
    description: 'Play a track in your voice channel',
    options: [
      {
        name: 'url',
        description: 'The URL of the track to play',
        type: 3,
        required: true
      }
    ]
  };

  readonly permissions = [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak];

  async execute(interaction: CommandInteraction): Promise<void> {
    if (!this.hasPermissions(interaction)) {
      await this.reply(interaction, 'You do not have permission to use this command.');
      return;
    }

    const member = interaction.member as GuildMember;
    const voiceChannel = member.voice.channel as VoiceChannel;

    if (!voiceChannel) {
      await this.reply(interaction, 'You need to be in a voice channel to use this command.');
      return;
    }

    try {
      const url = interaction.options.get('url')?.value as string;
      const client = getStarbunkClient(interaction.client);
      const player = client.getMusicPlayer();

      await player.joinChannel(voiceChannel);
      // Additional logic for playing the track...
      
      await this.reply(interaction, `Now playing track from ${url}`);
    } catch (error) {
      console.error('Failed to play track:', error);
      await this.reply(interaction, 'Failed to play the track. Please try again.');
    }
  }
} 