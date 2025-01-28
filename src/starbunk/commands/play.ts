import {
    CommandInteraction,
    GuildMember,
    SlashCommandBuilder,
} from 'discord.js';
import { joinVoiceChannel } from '@discordjs/voice';
import ytdl from 'ytdl-core';
import { getStarbunkClient } from '../starbunkClient';

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
            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: interaction.guildId!,
                adapterCreator: interaction.guild!.voiceAdapterCreator,
            });

            // Create an audio player
            const djCova = getStarbunkClient(interaction).getMusicPlayer();

            const subscription = djCova.subscribe(connection);
            if (!subscription) {
                console.error('Failed to subscribe player to the connection.');
            } else {
                console.log('Player successfully subscribed to connection.');
            }

            djCova.start(url);
            djCova.play();

            await interaction.followUp(`🎶 Now playing: ${url}`);
        } catch (error) {
            console.error(error);
            await interaction.followUp('An error occurred while trying to play the music.');
        }
    }
}
