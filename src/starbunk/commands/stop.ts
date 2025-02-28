import { getVoiceConnection } from '@discordjs/voice';
import { CommandInteraction, SlashCommandBuilder } from 'discord.js';
import guildIDs from '../../discord/guildIDs';
import { Logger } from '../../services/logger';
import { getStarbunkClient } from '../starbunkClient';

export default {
	data: new SlashCommandBuilder().setName('stop').setDescription('Stop playing and leave channel'),

	async execute(interaction: CommandInteraction) {
		try {
			const client = getStarbunkClient(interaction);
			if (!client) {
				await interaction.reply({ content: 'Unable to access audio player', ephemeral: true });
				return;
			}

			const guildId = interaction.guild?.id ?? guildIDs.StarbunkCrusaders;
			const connection = getVoiceConnection(guildId);

			if (!connection) {
				await interaction.reply({ content: 'Not currently in a voice channel', ephemeral: true });
				return;
			}

			// Stop the player and disconnect
			client.getMusicPlayer().stop();
			connection.disconnect();

			Logger.info('🛑 Stopped playback and disconnected from voice channel');
			await interaction.reply('🛑 Stopped playback and left the voice channel');
		} catch (error) {
			Logger.error('Error stopping playback', error as Error);
			await interaction.reply({
				content: 'An error occurred while stopping playback',
				ephemeral: true
			});
		}
	},
};
