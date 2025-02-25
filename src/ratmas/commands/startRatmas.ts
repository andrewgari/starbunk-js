import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction } from 'discord.js';
import { RatmasService } from '../RatmasService';

export const startRatmasCommand = {
	data: new SlashCommandBuilder()
		.setName('start-ratmas')
		.setDescription('Start the Ratmas gift exchange process')
		.setDefaultMemberPermissions('ADMINISTRATOR'),
	execute: async (interaction: ChatInputCommandInteraction, ratmasService: RatmasService) => {
		await interaction.deferReply();
		await ratmasService.startRatmas(interaction.guild!);
		await interaction.editReply('Ratmas has begun! 🐀');
	}
};
