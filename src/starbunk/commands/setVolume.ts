import { CommandInteraction, SlashCommandBuilder } from 'discord.js';
import { getStarbunkClient } from '../starbunkClient';

const commandBuilder = new SlashCommandBuilder()
	.setName('volume')
	.setDescription('It makes the noises go up and down')
	.addIntegerOption((option) => option.setName('noise').setDescription('set player volume %').setRequired(true));

export default {
	data: commandBuilder.toJSON(),
	async execute(interaction: CommandInteraction) {
		const client = getStarbunkClient(interaction);

		let vol = interaction.options.get('volume')?.value as number;
		if (client && vol > 1 && vol <= 100) {
			vol = Math.round(vol / 10);
			client.getMusicPlayer().changeVolume(vol);
		}
	},
};
