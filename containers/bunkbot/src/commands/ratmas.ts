import { CommandInteraction, SlashCommandBuilder, GuildMember } from 'discord.js';
import { logger } from '@starbunk/shared';

const commandBuilder = new SlashCommandBuilder()
	.setName('ratmas')
	.setDescription('Assigns Ratmas pairs to all users with the @ratmas role');

interface RatmasPair {
	giver: GuildMember;
	receiver: GuildMember;
}

/**
 * Shuffles an array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
	const shuffled = [...array];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

/**
 * Creates Ratmas pairs ensuring no one gets themselves
 */
function createRatmasPairs(members: GuildMember[]): RatmasPair[] {
	if (members.length < 2) {
		throw new Error('Need at least 2 members to create pairs');
	}

	const shuffledMembers = shuffleArray(members);
	const pairs: RatmasPair[] = [];

	// Create a circular assignment to ensure everyone gives and receives
	for (let i = 0; i < shuffledMembers.length; i++) {
		const giver = shuffledMembers[i];
		const receiver = shuffledMembers[(i + 1) % shuffledMembers.length];
		
		pairs.push({ giver, receiver });
	}

	return pairs;
}

/**
 * Sends DM to a user with their Ratmas assignment
 */
async function sendRatmasAssignment(giver: GuildMember, receiver: GuildMember): Promise<boolean> {
	try {
		const dmMessage = `🎄 **Ratmas Assignment** 🎄\n\n` +
			`Ho ho ho! You've been assigned to give a gift to: **${receiver.displayName}** (${receiver.user.username})\n\n` +
			`Remember:\n` +
			`• Keep it secret! 🤫\n` +
			`• Be thoughtful and kind 💝\n` +
			`• Have fun with it! 🎉\n\n` +
			`Happy Ratmas! 🐀🎄`;

		await giver.send(dmMessage);
		logger.info(`✅ Sent Ratmas assignment to ${giver.displayName}: giving to ${receiver.displayName}`);
		return true;
	} catch (error) {
		logger.error(`❌ Failed to send DM to ${giver.displayName}:`, error instanceof Error ? error : new Error(String(error)));
		return false;
	}
}

export default {
	data: commandBuilder.toJSON(),
	permission: ['ADMINISTRATOR'], // Only admins can run this command
	async execute(interaction: CommandInteraction) {
		try {
			await interaction.deferReply({ ephemeral: true });

			const guild = interaction.guild;
			if (!guild) {
				await interaction.editReply('❌ This command can only be used in a server!');
				return;
			}

			logger.info(`🎄 Ratmas command initiated by ${interaction.user.username} in ${guild.name}`);

			// Find the @ratmas role
			const ratmasRole = guild.roles.cache.find(role => 
				role.name.toLowerCase() === 'ratmas' || 
				role.name.toLowerCase() === '@ratmas'
			);

			if (!ratmasRole) {
				await interaction.editReply('❌ Could not find a @ratmas role! Please create one first.');
				return;
			}

			// Get all members with the @ratmas role
			const ratmasMembers = ratmasRole.members.filter(member => !member.user.bot);

			if (ratmasMembers.size === 0) {
				await interaction.editReply('❌ No users found with the @ratmas role!');
				return;
			}

			if (ratmasMembers.size < 2) {
				await interaction.editReply('❌ Need at least 2 users with the @ratmas role to create pairs!');
				return;
			}

			logger.info(`🎄 Found ${ratmasMembers.size} members with @ratmas role`);

			// Create pairs
			const membersArray = Array.from(ratmasMembers.values());
			const pairs = createRatmasPairs(membersArray);

			// Send DMs to all participants
			let successCount = 0;
			let failCount = 0;

			await interaction.editReply(`🎄 Creating Ratmas assignments for ${pairs.length} participants...`);

			for (const pair of pairs) {
				const success = await sendRatmasAssignment(pair.giver, pair.receiver);
				if (success) {
					successCount++;
				} else {
					failCount++;
				}
				
				// Small delay to avoid rate limiting
				await new Promise(resolve => setTimeout(resolve, 500));
			}

			// Log the assignments for admin reference
			logger.info('🎄 Ratmas Assignments Created:');
			pairs.forEach((pair, index) => {
				logger.info(`  ${index + 1}. ${pair.giver.displayName} → ${pair.receiver.displayName}`);
			});

			// Final response
			const resultMessage = `🎄 **Ratmas Assignments Complete!** 🎄\n\n` +
				`✅ Successfully sent: ${successCount} assignments\n` +
				`${failCount > 0 ? `❌ Failed to send: ${failCount} assignments\n` : ''}` +
				`\nAll participants should have received their assignments via DM! 🎁`;

			await interaction.editReply(resultMessage);

			logger.info(`🎄 Ratmas command completed: ${successCount} success, ${failCount} failed`);

		} catch (error) {
			logger.error('❌ Error in Ratmas command:', error instanceof Error ? error : new Error(String(error)));
			
			const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
			await interaction.editReply(`❌ Error creating Ratmas assignments: ${errorMessage}`);
		}
	},
};
