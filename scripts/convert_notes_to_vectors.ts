import { config } from 'dotenv';
import { logger } from '../src/services/logger';
import { CampaignService } from '../src/starbunk/services/campaignService';
import { NoteService } from '../src/starbunk/services/noteService';
import { VectorService } from '../src/starbunk/services/vectorService';
import { TextWithMetadata } from '../src/starbunk/types/text';

interface ExtendedError extends Error {
	campaignId?: string;
	stack?: string;
}

async function convertNotesToVectors() {
	// Load environment variables
	config();

	logger.info('Starting note to vector conversion process...');
	logger.debug('[Vector Conversion] Environment check', {
		cwd: process.cwd(),
		nodeEnv: process.env.NODE_ENV,
		vectorContextDir: process.env.VECTOR_CONTEXT_DIR
	});

	try {
		// Get services
		logger.debug('[Vector Conversion] Initializing services...');
		const campaignService = CampaignService.getInstance();
		const noteService = NoteService.getInstance();
		const vectorService = VectorService.getInstance();
		logger.info('[Vector Conversion] Services initialized successfully');

		// Get all campaigns
		logger.debug('[Vector Conversion] Fetching campaigns...');
		const campaigns = await campaignService.getCampaigns();
		logger.info(`[Vector Conversion] Found ${campaigns.length} campaigns to process`, {
			campaignIds: campaigns.map(c => c.id),
			campaignNames: campaigns.map(c => c.name)
		});

		// Process each campaign
		for (const campaign of campaigns) {
			logger.info(`[Vector Conversion] Processing campaign: ${campaign.name}`, {
				campaignId: campaign.id,
				campaignName: campaign.name
			});

			// Get all notes (including GM notes)
			logger.debug(`[Vector Conversion] Fetching notes for campaign ${campaign.name}...`);
			const notes = await noteService.getNotes(campaign.id, { isGM: true });
			logger.info(`[Vector Conversion] Found ${notes.length} notes in campaign ${campaign.name}`, {
				campaignId: campaign.id,
				noteCount: notes.length,
				gmNoteCount: notes.filter(n => n.isGMOnly).length,
				playerNoteCount: notes.filter(n => !n.isGMOnly).length,
				categories: [...new Set(notes.map(n => n.category))],
				oldestNote: notes.length > 0 ? notes.reduce((min, n) => n.timestamp < min.timestamp ? n : min).timestamp : null,
				newestNote: notes.length > 0 ? notes.reduce((max, n) => n.timestamp > max.timestamp ? n : max).timestamp : null
			});

			if (notes.length === 0) {
				logger.warn(`[Vector Conversion] No notes found for campaign ${campaign.name}, skipping...`);
				continue;
			}

			// Convert all notes to TextWithMetadata format
			logger.debug(`[Vector Conversion] Converting notes to TextWithMetadata format for ${campaign.name}...`);
			const textsWithMetadata: TextWithMetadata[] = notes.map(note => {
				const metadata = {
					file: `note_${note.timestamp.toISOString()}.json`,
					is_gm_content: note.isGMOnly,
					chunk_size: note.content.length,
					category: note.category,
					tags: note.tags,
					created_at: note.timestamp.toISOString()
				};
				logger.debug(`[Vector Conversion] Created metadata for note`, {
					campaignId: campaign.id,
					noteTimestamp: note.timestamp,
					metadata
				});
				return {
					text: note.content,
					metadata
				};
			});
			logger.info(`[Vector Conversion] Converted ${textsWithMetadata.length} notes to TextWithMetadata format`, {
				campaignId: campaign.id,
				totalTextLength: textsWithMetadata.reduce((sum, t) => sum + t.text.length, 0),
				averageTextLength: textsWithMetadata.reduce((sum, t) => sum + t.text.length, 0) / textsWithMetadata.length
			});

			// Generate vectors for all notes at once
			try {
				logger.debug(`[Vector Conversion] Starting vector generation for campaign ${campaign.name}...`, {
					campaignId: campaign.id,
					noteCount: textsWithMetadata.length
				});

				await vectorService.generateVectorsFromTexts(campaign.id, textsWithMetadata);

				logger.info(`[Vector Conversion] Successfully converted ${notes.length} notes to vectors`, {
					campaignId: campaign.id,
					campaignName: campaign.name,
					vectorPath: `/data/vectors/${campaign.id}/vectors.npy`,
					metadataPath: `/data/vectors/${campaign.id}/metadata.json`,
					textsPath: `/data/vectors/${campaign.id}/texts.json`
				});
			} catch (error) {
				const extendedError: ExtendedError = error instanceof Error ? error : new Error(String(error));
				extendedError.campaignId = campaign.id;
				logger.error(`[Vector Conversion] Failed to convert notes to vectors for campaign ${campaign.name}:`, extendedError);
			}
		}

		logger.info('[Vector Conversion] Note to vector conversion completed successfully');
	} catch (error) {
		const extendedError: ExtendedError = error instanceof Error ? error : new Error(String(error));
		logger.error('[Vector Conversion] Error during note to vector conversion:', extendedError);
		process.exit(1);
	}
}

// Run the conversion
convertNotesToVectors().catch(error => {
	const extendedError: ExtendedError = error instanceof Error ? error : new Error(String(error));
	logger.error('[Vector Conversion] Unhandled error in conversion process:', extendedError);
	process.exit(1);
});
