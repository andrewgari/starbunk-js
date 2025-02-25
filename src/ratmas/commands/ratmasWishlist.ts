import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction } from 'discord.js';
import { RatmasService } from '../RatmasService';

export const ratmasWishlistCommand = {
	data: new SlashCommandBuilder()
		.setName('ratmas-wishlist')
		.setDescription('Set your Ratmas wishlist')
		.addStringOption(option =>
			option
				.setName('url')
				.setDescription('Your Amazon wishlist URL')
				.setRequired(true)
		),
	execute: async (interaction: ChatInputCommandInteraction, ratmasService: RatmasService) => {
		await interaction.deferReply({ ephemeral: true });
		const url = interaction.options.getString('url', true);
		await ratmasService.setWishlist(interaction.user.id, url);
		await interaction.editReply('Your wishlist has been updated! 🎁');
	}
};
