import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction } from 'discord.js';
import { RatmasService } from '../RatmasService';

export const ratmasCommands = [
	{
		data: new SlashCommandBuilder()
			.setName('start-ratmas')
			.setDescription('Start the Ratmas gift exchange process')
			.setDefaultMemberPermissions('ADMINISTRATOR'),
		execute: async (interaction: ChatInputCommandInteraction, ratmasService: RatmasService) => {
			await interaction.deferReply();
			await ratmasService.startRatmas(interaction.guild!);
			await interaction.editReply('Ratmas has begun! 🐀');
		}
	},
	{
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
			// TODO: Add method to RatmasService
			await ratmasService.setWishlist(interaction.user.id, url);
			await interaction.editReply('Your wishlist has been updated! 🎁');
		}
	},
	// Additional commands to be implemented...
];
