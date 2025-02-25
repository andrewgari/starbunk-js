import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction } from 'discord.js';
import { RatmasService } from '../RatmasService';

export const ratmasAdjustDateCommand = {
	data: new SlashCommandBuilder()
		.setName('ratmas-adjust-date')
		.setDescription('Adjust the Ratmas opening date')
		.setDefaultMemberPermissions('ADMINISTRATOR')
		.addStringOption(option =>
			option
				.setName('date')
				.setDescription('New opening date (MM/DD/YYYY)')
				.setRequired(true)
		),
	execute: async (interaction: ChatInputCommandInteraction, ratmasService: RatmasService) => {
		await interaction.deferReply();
		const dateStr = interaction.options.getString('date', true);
		await ratmasService.adjustOpeningDate(interaction.guild!, dateStr);
		await interaction.editReply(`Ratmas opening date updated to ${dateStr}! 🐀`);
	}
};
