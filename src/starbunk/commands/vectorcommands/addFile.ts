import { ChatInputCommandInteraction, GuildMember, SlashCommandBuilder } from 'discord.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../../../services/logger';
import { CampaignFileService } from '../../services/campaignFileService';
import { VectorEmbeddingService } from '../../services/vectorEmbeddingService';
import { VectorService } from '../../services/vectorService';
import { TextWithMetadata } from '../../types/text';
import { getCampaignContext, getCampaignPermissions } from '../../utils/campaignChecks';

// Define the command
export const data = new SlashCommandBuilder()
	.setName('rpg-vector-add-file')
	.setDescription('Add a file to the vector database')
	.addStringOption(option =>
		option
			.setName('file')
			.setDescription('File path (relative to campaign dir)')
			.setRequired(true)
	)
	.addBooleanOption(option =>
		option
			.setName('is_gm')
			.setDescription('Mark as GM-only content')
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
			const embeddingService = VectorEmbeddingService.getInstance();

			// Get options
			const filePath = interaction.options.getString('file', true);
			const isGM = interaction.options.getBoolean('is_gm') ?? false;
			const model = interaction.options.getString('model');
			const chunkSize = interaction.options.getInteger('chunk_size') ?? 512;

			// Get campaign context
			const campaignId = permissions.campaignId;
			if (!campaignId) {
				await interaction.editReply({
					content: 'No active campaign found. Please select a campaign first.'
				});
				return;
			}

			// Resolve file path
			const campaignBasePath = path.join(fileService.getCampaignBasePath(), campaignId);
			const fullFilePath = path.join(campaignBasePath, filePath);

			// Check if file exists
			try {
				const stats = await fs.stat(fullFilePath);
				if (!stats.isFile()) {
					await interaction.editReply({
						content: `"${filePath}" is not a file.`
					});
					return;
				}
			} catch (error) {
				await interaction.editReply({
					content: `File "${filePath}" does not exist in campaign ${campaignId}.`
				});
				return;
			}

			// Check file extension (only process text and markdown files)
			const fileExt = path.extname(fullFilePath).toLowerCase();
			if (!['.txt', '.md', '.mdx', '.text'].includes(fileExt)) {
				await interaction.editReply({
					content: `Only text and markdown files (.txt, .md, .mdx) are supported. File has extension: ${fileExt}`
				});
				return;
			}

			// Initialize the embedding service with the specified model
			if (model) {
				await embeddingService.initialize(model);
			} else {
				await embeddingService.initialize();
			}

			// Read file
			const content = await fs.readFile(fullFilePath, 'utf-8');
			const outputDir = path.join(process.cwd(), 'data', 'vectors');

			// Create output directory
			await fs.mkdir(outputDir, { recursive: true });

			// Process the file
			const contentWithMetadata: TextWithMetadata[] = [];
			const relativeFilePath = path.relative(campaignBasePath, fullFilePath);

			// Split into chunks if needed
			if (content.length > chunkSize) {
				const chunks = [];
				for (let i = 0; i < content.length; i += chunkSize) {
					chunks.push(content.substring(i, i + chunkSize));
				}

				// Add each chunk with metadata
				for (const chunk of chunks) {
					contentWithMetadata.push({
						text: chunk,
						metadata: {
							file: relativeFilePath,
							is_gm_content: isGM,
							chunk_size: chunkSize
						}
					});
				}
			} else {
				// Add the entire content with metadata
				contentWithMetadata.push({
					text: content,
					metadata: {
						file: relativeFilePath,
						is_gm_content: isGM,
						chunk_size: chunkSize
					}
				});
			}

			// Create namespace based on campaign ID and file name
			const fileName = path.basename(fullFilePath, path.extname(fullFilePath));
			const namespace = `${campaignId}_${fileName.replace(/[^a-zA-Z0-9]/g, '_')}`;

			// Generate vectors
			await vectorService.generateVectorsFromTexts(namespace, contentWithMetadata);

			await interaction.editReply({
				content: `Successfully added file "${filePath}" to vector database.\nNamespace: ${namespace}\n${isGM ? 'Content marked as GM-only.' : ''}`
			});
		} catch (error) {
			logger.error('Error adding file to vector database:', error instanceof Error ? error : new Error(String(error)));
			await interaction.editReply({
				content: 'Failed to add file to vector database. Please check the logs for details.'
			});
		}
	} catch (error) {
		logger.error('Error executing add-file command:', error instanceof Error ? error : new Error(String(error)));

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

export default {
	data: data.toJSON(),
	execute
};
