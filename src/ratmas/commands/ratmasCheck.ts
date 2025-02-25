import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction } from 'discord.js';
import { RatmasService } from '../RatmasService';

export const ratmasCheckCommand = {
	data: new SlashCommandBuilder()
		.setName('ratmas-check')
		.setDescription('Check your target\'s wishlist'),
	execute: async (interaction: ChatInputCommandInteraction, ratmasService: RatmasService) => {
		await interaction.deferReply({ ephemeral: true });
		const wishlist = await ratmasService.getTargetWishlist(interaction.user.id);
		await interaction.editReply(wishlist);
	}
};
