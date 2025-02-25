import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction } from 'discord.js';
import { RatmasService } from '../RatmasService';

// Command factory to reduce duplication
const createCommand = (
	name: string,
	description: string,
	options: {
		isAdmin?: boolean,
		stringOptions?: Array<{ name: string, description: string, required: boolean }>,
		ephemeral?: boolean
	},
	executeFunction: (interaction: ChatInputCommandInteraction, ratmasService: RatmasService) => Promise<void>
) => {
	const builder = new SlashCommandBuilder()
		.setName(name)
		.setDescription(description);

	if (options.isAdmin) {
		builder.setDefaultMemberPermissions('ADMINISTRATOR');
	}

	if (options.stringOptions) {
		options.stringOptions.forEach(opt => {
			builder.addStringOption(option =>
				option
					.setName(opt.name)
					.setDescription(opt.description)
					.setRequired(opt.required)
			);
		});
	}

	return {
		data: builder,
		execute: async (interaction: ChatInputCommandInteraction, ratmasService: RatmasService) => {
			await interaction.deferReply({ ephemeral: options.ephemeral });
			await executeFunction(interaction, ratmasService);
		}
	};
};

export const startRatmasCommand = createCommand(
	'start-ratmas',
	'Start the Ratmas gift exchange process',
	{ isAdmin: true },
	async (interaction, ratmasService) => {
		await ratmasService.startRatmas(interaction.guild!);
		await interaction.editReply('Ratmas has begun! 🐀');
	}
);

export const ratmasWishlistCommand = createCommand(
	'ratmas-wishlist',
	'Set your Ratmas wishlist',
	{
		ephemeral: true,
		stringOptions: [{ name: 'url', description: 'Your Amazon wishlist URL', required: true }]
	},
	async (interaction, ratmasService) => {
		const url = interaction.options.get('url')?.value as string;
		await ratmasService.setWishlist(interaction.user.id, url);
		await interaction.editReply('Your wishlist has been updated! 🎁');
	}
);

export const ratmasCheckCommand = createCommand(
	'ratmas-check',
	'Check your target\'s wishlist',
	{ ephemeral: true },
	async (interaction, ratmasService) => {
		const wishlist = await ratmasService.getTargetWishlist(interaction.user.id);
		await interaction.editReply(wishlist);
	}
);

export const ratmasReportCommand = createCommand(
	'ratmas-report',
	'Report an issue with a wishlist',
	{
		ephemeral: true,
		stringOptions: [{ name: 'message', description: 'What\'s wrong with the wishlist?', required: true }]
	},
	async (interaction, ratmasService) => {
		const message = interaction.options.get('message')?.value as string;
		await ratmasService.reportWishlistIssue(interaction.user.id, message);
		await interaction.editReply('Issue reported anonymously! 🐀');
	}
);

export const ratmasAdjustDateCommand = createCommand(
	'ratmas-adjust-date',
	'Adjust the Ratmas opening date',
	{
		isAdmin: true,
		stringOptions: [{ name: 'date', description: 'New opening date (MM/DD/YYYY)', required: true }]
	},
	async (interaction, ratmasService) => {
		const dateStr = interaction.options.get('date')?.value as string;
		await ratmasService.adjustOpeningDate(interaction.guild!, dateStr);
		await interaction.editReply(`Ratmas opening date updated to ${dateStr}! 🐀`);
	}
);

export const ratmasEndCommand = createCommand(
	'ratmas-end',
	'End the current Ratmas event',
	{ isAdmin: true },
	async (interaction, ratmasService) => {
		await ratmasService.endRatmas(interaction.guild!);
		await interaction.editReply('Ratmas has ended! The channel will be archived. 🐀');
	}
);

export const ratmasCommands = [
	startRatmasCommand,
	ratmasWishlistCommand,
	ratmasCheckCommand,
	ratmasReportCommand,
	ratmasAdjustDateCommand,
	ratmasEndCommand
];
