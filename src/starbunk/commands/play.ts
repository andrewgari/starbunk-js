import { AudioPlayerStatus, joinVoiceChannel } from '@discordjs/voice';
import {
  CommandInteraction,
  GuildMember,
  SlashCommandBuilder
} from 'discord.js';

import StarbunkClient, { getStarbunkClient } from '../starbunkClient';

export default {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a YouTube link in voice chat')
    .addStringOption((option) =>
      option
        .setName('song')
        .setDescription('YouTube video URL')
        .setRequired(true)
    ),
  async execute(interaction: CommandInteraction) {
    const url = interaction.options.get('song')?.value as string;
    const member = interaction.member as GuildMember;

    if (!url) {
      await interaction.reply('Please provide a valid YouTube link!');

      return;
    }

    const voiceChannel = member.voice.channel;
    if (!voiceChannel) {
      await interaction.reply(
        'You need to be in a voice channel to use this command!'
      );

      return;
    }

    try {
      await interaction.deferReply();

      // Join the voice channel
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator
      });

      if (!connection.state.status || connection.state.status === 'disconnected') {
        console.log('❌ Connection state invalid. Reconnecting...');
      }

      // Create an audio player
      const djCova = getStarbunkClient(interaction).getMusicPlayer();

      djCova.on(AudioPlayerStatus.Playing, () => {
        console.log('Audio is now playing');
      });

      djCova.on(AudioPlayerStatus.Idle, () => {
        console.log('Audio playback ended.');
      });

      await djCova.start(url);

      const subscription = djCova.subscribe(connection);
      if (!subscription) {
        console.error('❌ Failed to subscribe player.');
      }
      else {
        console.log('✅ Subscribed to voice connection.');
        (interaction.client as StarbunkClient).activeSubscription = subscription;
      }

      await interaction.followUp(`🎶 Now playing: ${url}`);
    }
    catch (error) {
      console.error('Error executing play command:', error);
      await interaction.followUp(
        'An error occurred while trying to play the music.'
      );
    }
  }
};
