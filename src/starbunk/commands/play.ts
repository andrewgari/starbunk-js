import { AudioPlayerStatus, joinVoiceChannel } from '@discordjs/voice';
import { CommandInteraction, GuildMember, SlashCommandBuilder } from 'discord.js';
import loggerAdapter from '../../services/loggerAdapter';
import StarbunkClient, { getStarbunkClient } from '../starbunkClient';

export default {
	data: new SlashCommandBuilder()
		.setName('play')
		.setDescription('Play a YouTube link in voice chat')
		.addStringOption((option) => option.setName('song').setDescription('YouTube video URL').setRequired(true)),
	async execute(interaction: CommandInteraction) {
		const url = interaction.options.get('song')?.value as string;
		const member = interaction.member as GuildMember;

		if (!url) {
			loggerAdapter.warn('Play command executed without URL');
			await interaction.reply('Please provide a valid YouTube link!');
			return;
		}

		const voiceChannel = member.voice.channel;
		if (!voiceChannel) {
			loggerAdapter.warn('Play command executed outside voice channel');
			await interaction.reply('You need to be in a voice channel to use this command!');
			return;
		}

		try {
			loggerAdapter.info(`🎵 Attempting to play: ${url}`);
			await interaction.deferReply();

			const connection = joinVoiceChannel({
				channelId: voiceChannel.id,
				guildId: voiceChannel.guild.id,
				adapterCreator: voiceChannel.guild.voiceAdapterCreator,
			});

			if (!connection.state.status || connection.state.status === 'disconnected') {
				loggerAdapter.warn('Voice connection invalid, attempting reconnect');
			}

			const djCova = getStarbunkClient(interaction).getMusicPlayer();

			djCova.on(AudioPlayerStatus.Playing, () => {
				loggerAdapter.info('🎶 Audio playback started');
			});

			djCova.on(AudioPlayerStatus.Idle, () => {
				loggerAdapter.info('⏹️ Audio playback ended');
			});

			await djCova.start(url);

			const subscription = djCova.subscribe(connection);
			if (!subscription) {
				loggerAdapter.error('Failed to subscribe to voice connection');
			} else {
				loggerAdapter.success('Successfully subscribed to voice connection');
				(interaction.client as StarbunkClient).activeSubscription = subscription;
			}

			await interaction.followUp(`🎶 Now playing: ${url}`);
		} catch (error) {
			loggerAdapter.error('Error executing play command', error as Error);
			await interaction.followUp('An error occurred while trying to play the music.');
		}
	},
};
