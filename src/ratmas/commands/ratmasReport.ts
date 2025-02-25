import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction } from 'discord.js';
import { RatmasService } from '../RatmasService';

export const ratmasReportCommand = {
	data: new SlashCommandBuilder()
		.setName('ratmas-report')
		.setDescription('Report an issue with a wishlist')
		.addStringOption(option =>
			option
				.setName('message')
				.setDescription('What\'s wrong with the wishlist?')
				.setRequired(true)
		),
	execute: async (interaction: ChatInputCommandInteraction, ratmasService: RatmasService) => {
		await interaction.deferReply({ ephemeral: true });
		const message = interaction.options.getString('message', true);
		await ratmasService.reportWishlistIssue(interaction.user.id, message);
		await interaction.editReply('Issue reported anonymously! 🐀');
	}
};
