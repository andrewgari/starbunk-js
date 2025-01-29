import {
    CommandInteraction,
    GuildMember,
    SlashCommandBuilder,
} from 'discord.js';
import {AudioPlayerStatus, joinVoiceChannel} from '@discordjs/voice';
import ytdl from 'ytdl-core';
import { getStarbunkClient } from '../starbunkClient';
import connectToChannel from "../../utils/connectToChannel";
import GuildIDs from "../../discord/guildIDs";

export default {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a YouTube link in voice chat')
        .addStringOption(option =>
            option
                .setName('song')
                .setDescription('YouTube video URL')
                .setRequired(true)
        ),
    async execute(interaction: CommandInteraction) {
        const url = interaction.options.get('song')?.value as string;
        const member = interaction.member as GuildMember;

        if (!url || !ytdl.validateURL(url)) {
            await interaction.reply('Please provide a valid YouTube link!');
            return;
        }

        const voiceChannel = member.voice.channel;
        if (!voiceChannel) {
            await interaction.reply('You need to be in a voice channel to use this command!');
            return;
        }

        try {
            member.voice.selfDeaf = true;
            await interaction.deferReply();

            // Join the voice channel
            const connection = await connectToChannel(voiceChannel.id, interaction.guildId ?? GuildIDs.CovaDaxServer, interaction.guild!.voiceAdapterCreator);

            // Create an audio player
            const djCova = getStarbunkClient(interaction).getMusicPlayer();

            djCova.on(AudioPlayerStatus.Playing, () => {
              console.log('Audio is now playing');
            });

            djCova.on(AudioPlayerStatus.Idle, () => {
                console.log('Audio playback ended.');
            });

            const subscription = djCova.subscribe(connection);
            if (!subscription) {
                console.error('Failed to subscribe player to the connection.');
            } else {
                console.log('Player successfully subscribed to connection.');
            }
            await interaction.followUp(`🎶 Now playing: ${url}`);
            // await djCova.start(url);
            await djCova.start('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3');
        } catch (error) {
            console.error(error);
            await interaction.followUp('An error occurred while trying to play the music.');
        }
    }
}
