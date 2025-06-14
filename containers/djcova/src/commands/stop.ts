import { getVoiceConnection } from '@discordjs/voice';
import { CommandInteraction, SlashCommandBuilder } from 'discord.js';
import guildIds from '../../discord/guildIds';
import { getStarbunkClient } from '../starbunkClient';

const commandBuilder = new SlashCommandBuilder()
	.setName('stop')
	.setDescription('Stop playing and leave channel');

export default {
	data: commandBuilder.toJSON(),
	async execute(interaction: CommandInteraction) {
		const client = getStarbunkClient(interaction);
		if (client) {
			client.getMusicPlayer().stop();
			const connection = getVoiceConnection(interaction.guild?.id ?? guildIds.CovaDaxServer);
			connection?.disconnect();
		}
	},
};
