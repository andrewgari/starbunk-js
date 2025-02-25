import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction } from 'discord.js';
import { RatmasService } from '../RatmasService';

export const ratmasEndCommand = {
	data: new SlashCommandBuilder()
		.setName('ratmas-end')
		.setDescription('End the current Ratmas event')
		.setDefaultMemberPermissions('ADMINISTRATOR'),
	execute: async (interaction: ChatInputCommandInteraction, ratmasService: RatmasService) => {
		await interaction.deferReply();
		await ratmasService.endRatmas(interaction.guild!);
		await interaction.editReply('Ratmas has ended! The channel will be archived. 🐀');
	}
};
