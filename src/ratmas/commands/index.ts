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
	{
		data: new SlashCommandBuilder()
			.setName('ratmas-check')
			.setDescription('Check your target\'s wishlist'),
		execute: async (interaction: ChatInputCommandInteraction, ratmasService: RatmasService) => {
			await interaction.deferReply({ ephemeral: true });
			const wishlist = await ratmasService.getTargetWishlist(interaction.user.id);
			await interaction.editReply(wishlist);
		}
	},
	{
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
	},
	{
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
	},
	{
		data: new SlashCommandBuilder()
			.setName('ratmas-end')
			.setDescription('End the current Ratmas event')
			.setDefaultMemberPermissions('ADMINISTRATOR'),
		execute: async (interaction: ChatInputCommandInteraction, ratmasService: RatmasService) => {
			await interaction.deferReply();
			await ratmasService.endRatmas(interaction.guild!);
			await interaction.editReply('Ratmas has ended! The channel will be archived. 🐀');
		}
	},
	// Additional commands to be implemented...
];
