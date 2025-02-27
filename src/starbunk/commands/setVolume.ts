import { CommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Logger } from '../../services/logger';
import { getStarbunkClient } from '../starbunkClient';

export default {
	data: new SlashCommandBuilder()
		.setName('volume')
		.setDescription('It makes the noises go up and down')
		.addIntegerOption((option) =>
			option.setName('noise')
				.setDescription('set player volume %')
				.setRequired(true)
				.setMinValue(1)
				.setMaxValue(100)),

	async execute(interaction: CommandInteraction) {
		try {
			const client = getStarbunkClient(interaction);
			if (!client) {
				await interaction.reply({ content: 'Unable to access audio player', ephemeral: true });
				return;
			}

			// Get the volume from the 'noise' parameter (not 'volume')
			const vol = interaction.options.get('noise')?.value as number;

			if (vol >= 1 && vol <= 100) {
				client.getMusicPlayer().changeVolume(vol);
				await interaction.reply(`🔊 Volume set to ${vol}%`);
			} else {
				await interaction.reply({
					content: 'Volume must be between 1 and 100',
					ephemeral: true
				});
			}
		} catch (error) {
			Logger.error('Error setting volume', error as Error);
			await interaction.reply({
				content: 'An error occurred while setting the volume',
				ephemeral: true
			});
		}
	},
};
