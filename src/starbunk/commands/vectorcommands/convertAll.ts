import { ChatInputCommandInteraction, GuildMember, SlashCommandBuilder } from 'discord.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../../../services/logger';
import { CampaignFileService } from '../../services/campaignFileService';
import { VectorService } from '../../services/vectorService';
import { getCampaignContext, getCampaignPermissions } from '../../utils/campaignChecks';

// Define the command
export const data = new SlashCommandBuilder()
	.setName('rpg-vector-convert-all')
	.setDescription('Convert all documents in campaign directory to vector files')
	.addStringOption(option =>
		option
			.setName('output_dir')
			.setDescription('Output directory for vector files (default: data/vectors)')
	)
	.addBooleanOption(option =>
		option
			.setName('include_gm')
			.setDescription('Include GM-only content')
	)
	.addStringOption(option =>
		option
			.setName('model')
			.setDescription('Vector model to use')
	)
	.addIntegerOption(option =>
		option
			.setName('chunk_size')
			.setDescription('Size of text chunks')
	);

// Execute the command
export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
	try {
		// Get campaign context and permissions
		const member = interaction.member as GuildMember;
		const context = getCampaignContext(member, interaction.channelId);
		const permissions = await getCampaignPermissions(context);

		// Check if user has GM permissions
		if (!permissions.canManageCampaign) {
			await interaction.reply({
				content: 'Only GMs can manage the vector database.',
				ephemeral: true
			});
			return;
		}

		// Start processing
		await interaction.deferReply({ ephemeral: true });

		try {
			// Get services
			const fileService = CampaignFileService.getInstance();
			const vectorService = VectorService.getInstance();

			// Get options
			const includeGM = interaction.options.getBoolean('include_gm') ?? false;
			const model = interaction.options.getString('model');
			const chunkSize = interaction.options.getInteger('chunk_size');
			const outputDir = interaction.options.getString('output_dir') ||
				path.join(process.cwd(), 'data', 'vectors');

			// Get campaign context
			const campaignId = permissions.campaignId;
			if (!campaignId) {
				await interaction.editReply({
					content: 'No active campaign found. Please select a campaign first.'
				});
				return;
			}

			// Create output directory if it doesn't exist
			await fs.mkdir(outputDir, { recursive: true });

			// Get campaign base path
			const campaignBasePath = path.join(fileService.getCampaignBasePath(), campaignId);

			// Process player content
			const playerDir = path.join(campaignBasePath, 'player');
			let playerProcessed = false;
			if (await directoryExists(playerDir)) {
				logger.info(`Processing player documents from ${playerDir}`);
				await vectorService.generateVectorsFromDirectory(playerDir, {
					isGMContent: false,
					outputDir,
					namespace: `${campaignId}_player`,
					...(model && { modelName: model }),
					...(chunkSize && { chunkSize })
				});
				playerProcessed = true;
			}

			// Process GM content if requested
			let gmProcessed = false;
			if (includeGM) {
				const gmDir = path.join(campaignBasePath, 'gm');
				if (await directoryExists(gmDir)) {
					logger.info(`Processing GM documents from ${gmDir}`);
					await vectorService.generateVectorsFromDirectory(gmDir, {
						isGMContent: true,
						outputDir,
						namespace: `${campaignId}_gm`,
						...(model && { modelName: model }),
						...(chunkSize && { chunkSize })
					});
					gmProcessed = true;
				}
			}

			if (!playerProcessed && !gmProcessed) {
				await interaction.editReply({
					content: 'No documents found in campaign directories. Please check your campaign structure.'
				});
				return;
			}

			await interaction.editReply({
				content: `Successfully converted campaign documents to vector files.\n\nOutput location: ${outputDir}\n${includeGM ? 'GM content included and marked as GM-only.' : 'Only player content was processed.'}`
			});
		} catch (error) {
			logger.error('Error converting campaign documents:', error instanceof Error ? error : new Error(String(error)));
			await interaction.editReply({
				content: 'Failed to convert campaign documents to vector files. Please check the logs for details.'
			});
		}
	} catch (error) {
		logger.error('Error executing vector convert-all command:', error instanceof Error ? error : new Error(String(error)));

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

// Helper function to check if a directory exists
async function directoryExists(directory: string): Promise<boolean> {
	try {
		const stats = await fs.stat(directory);
		return stats.isDirectory();
	} catch {
		return false;
	}
}

export default {
	data: data.toJSON(),
	execute
};
