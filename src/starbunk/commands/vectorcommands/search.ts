import { ChatInputCommandInteraction, EmbedBuilder, GuildMember, SlashCommandBuilder } from 'discord.js';
import * as path from 'path';
import { logger } from '../../../services/logger';
import { VectorService } from '../../services/vectorService';
import { TextWithMetadata } from '../../types/text';
import { getCampaignContext, getCampaignPermissions } from '../../utils/campaignChecks';

// Define the command
export const data = new SlashCommandBuilder()
	.setName('rpg-vector-search')
	.setDescription('Search for game content using vector embeddings')
	.addStringOption(option =>
		option
			.setName('query')
			.setDescription('Search query')
			.setRequired(true)
	)
	.addIntegerOption(option =>
		option
			.setName('limit')
			.setDescription('Maximum number of results to return')
	);

// Execute the command
export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
	try {
		// Get campaign context and permissions
		const member = interaction.member as GuildMember;
		const context = getCampaignContext(member, interaction.channelId);
		const permissions = await getCampaignPermissions(context);

		// Start processing
		await interaction.deferReply();

		try {
			// Get query
			const query = interaction.options.getString('query', true);
			const limit = interaction.options.getInteger('limit') ?? 5;

			// Get campaign context
			const campaignId = permissions.campaignId;
			if (!campaignId) {
				await interaction.editReply({
					content: 'No active campaign found. Please select a campaign first.'
				});
				return;
			}

			// Create vector service
			const vectorService = VectorService.getInstance();

			// Search for content
			const results = await vectorService.searchCampaignContent(
				campaignId,
				query,
				{
					limit,
					includeGMContent: permissions.canManageCampaign // Only GM can see GM content
				}
			);

			if (results.length === 0) {
				await interaction.editReply({
					content: `No results found for query: "${query}"`
				});
				return;
			}

			// Format results
			const embed = createResultsEmbed(query, results);

			await interaction.editReply({
				content: `**Search Results for:** "${query}"`,
				embeds: [embed]
			});
		} catch (error) {
			logger.error('Error searching vector database:', error instanceof Error ? error : new Error(String(error)));
			await interaction.editReply({
				content: 'Failed to search the vector database. Please check the logs for details.'
			});
		}
	} catch (error) {
		logger.error('Error executing vector search command:', error instanceof Error ? error : new Error(String(error)));

		// Make sure we respond to the interaction
		if (interaction.deferred) {
			await interaction.editReply({
				content: 'An error occurred while processing the command. Please try again later.'
			});
		} else {
			await interaction.reply({
				content: 'An error occurred while processing the command. Please try again later.',
				ephemeral: true
			});
		}
	}
}

// Helper function to create a Discord embed from search results
function createResultsEmbed(query: string, results: readonly TextWithMetadata[]): EmbedBuilder {
	const embed = new EmbedBuilder()
		.setTitle(`Search Results for: "${query}"`)
		.setColor('#0099ff')
		.setTimestamp();

	results.forEach((result, index) => {
		const fileName = path.basename(result.metadata.file);
		// Handle both metadata formats (isGMContent and is_gm_content)
		const isGM = (result.metadata.is_gm_content || result.metadata.isGMContent) ? ' 🔒 (GM Only)' : '';
		const similarity = (result.similarity || 0) * 100;
		const similarityPercent = similarity.toFixed(1);

		// Truncate text if too long
		let text = result.text;
		if (text.length > 200) {
			text = text.substring(0, 197) + '...';
		}

		embed.addFields({
			name: `${index + 1}. ${fileName}${isGM} (${similarityPercent}% match)`,
			value: text
		});
	});

	return embed;
}

export default {
	data: data.toJSON(),
	execute
};
