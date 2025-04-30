import { PrismaClient } from '@prisma/client';
import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';

const prisma = new PrismaClient();

export const data = new SlashCommandBuilder()
	.setName('blacklist')
	.setDescription('Manage the per-guild user blacklist')
	.addSubcommand(subcommand =>
		subcommand
			.setName('add')
			.setDescription('Add a user to the blacklist for this guild')
			.addUserOption(option =>
				option.setName('user').setDescription('User to blacklist').setRequired(true)
			)
	)
	.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
	if (!interaction.guildId) {
		await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
		return;
	}
	if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
		await interaction.reply({ content: 'You must be an admin to use this command.', ephemeral: true });
		return;
	}
	const subcommand = interaction.options.getSubcommand();
	if (subcommand === 'add') {
		const user = interaction.options.getUser('user', true);
		try {
			await prisma.blacklist.upsert({
				where: { guildId_userId: { guildId: interaction.guildId, userId: user.id } },
				update: {},
				create: { guildId: interaction.guildId, userId: user.id },
			});
			await interaction.reply({ content: `User <@${user.id}> has been blacklisted in this guild.`, ephemeral: true });
		} catch (error) {
			await interaction.reply({ content: 'Failed to add user to blacklist.', ephemeral: true });
		}
	}
}
