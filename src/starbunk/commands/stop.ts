import { getVoiceConnection } from '@discordjs/voice';
import { CommandInteraction, SlashCommandBuilder } from 'discord.js';
import guildIDs from '../../discord/guildIds';
import { getStarbunkClient } from '../starbunkClient';

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
