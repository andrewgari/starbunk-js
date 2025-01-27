import { spawn } from 'child_process';

import {
    CommandInteraction,
    GuildMember,
    SlashCommandBuilder,
} from 'discord.js';
import { joinVoiceChannel, createAudioPlayer, createAudioResource } from '@discordjs/voice';
import ytdl from 'ytdl-core';

export default {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a YouTube link in voice chat')
        .addStringOption(option =>
            option
                .setName('song')
                .setDescription('YouTube video URL')
                .setRequired(true)
        )   ,
    async execute(interaction: CommandInteraction) {
        const url = interaction.options.get('song')?.value as string;
        const member = interaction.member as GuildMember;

        console.log('got song command');
        if (!url || !ytdl.validateURL(url)) {
            await interaction.reply('Please provide a valid YouTube link!');
            return;
        }

        const voiceChannel = member.voice.channel;
        const volume = interaction.options.get('volume')?.value as number ?? 0;
        member.voice.selfDeaf;
        if (!voiceChannel) {
            await interaction.reply('You need to be in a voice channel to use this command!');
            return;
        }

        try {
            await interaction.deferReply();

            // Join the voice channel
            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: interaction.guildId!,
                adapterCreator: interaction.guild!.voiceAdapterCreator,
            });

            // Create an audio player
            console.log('creating audio player')
            const player = createAudioPlayer();

            const subscription = connection.subscribe(player);
            if (!subscription) {
                console.error('Failed to subscribe player to the connection.');
            } else {
                console.log('Player successfully subscribed to connection.');
            }


            const getYtDlpStream = (url: string) => {
                return spawn('yt-dlp', ['-o', '-', '-f', 'bestaudio', url], { stdio: ['ignore', 'pipe', 'ignore'] });
            };

            // Usage in your player
            const ytDlpStream = getYtDlpStream(url);
            const resource = createAudioResource(ytDlpStream.stdout, { inlineVolume: true });
            resource.volume?.setVolume(0.5);
            player.on('stateChange', (oldState: { status: any; }, newState: { status: any; }) => {
                console.log(`Player state changed from ${oldState.status} to ${newState.status}`);
            });

            player.on('error', (error: Error) => {
                console.error('AudioPlayer error:', error.message);
            });

            player.play(resource);
            console.log('Player status after play:', player.state.status);

            player.play(resource);

            await interaction.followUp(`🎶 Now playing: ${url}`);
        } catch (error) {
            console.error(error);
            await interaction.followUp('An error occurred while trying to play the music.');
        }
    }
}
