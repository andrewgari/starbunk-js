import guildIDs from '@/discord/guildIDs';
import { getStarbunkClient } from '@/starbunk/starbunkClient';
import { getVoiceConnection } from '@discordjs/voice';
import { CommandInteraction, SlashCommandBuilder } from 'discord.js';

export default {
	data: new SlashCommandBuilder().setName('stop').setDescription('Stop playing and leave channel'),
	async execute(interaction: CommandInteraction) {
		const client = getStarbunkClient(interaction);
		if (client) {
			client.getMusicPlayer().stop();
			const connection = getVoiceConnection(interaction.guild?.id ?? guildIDs.StarbunkCrusaders);
			connection?.disconnect();
		}
	},
};
