import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../../services/logger';

export interface CampaignDirectoryStructure {
	coreRules: string;
	textbooks: string;
	characters: string;
	sessionRecaps: string;
	generalNotes: string;
	gmNotes: string;
}

export class CampaignFileService {
	private static instance: CampaignFileService;
	private baseDir: string;

	private constructor() {
		this.baseDir = process.env.CAMPAIGNS_DIR || path.join(process.cwd(), 'data', 'campaigns');
	}

	public static getInstance(): CampaignFileService {
		if (!CampaignFileService.instance) {
			CampaignFileService.instance = new CampaignFileService();
		}
		return CampaignFileService.instance;
	}

	public getCampaignDirectoryStructure(campaignId: string): CampaignDirectoryStructure {
		const campaignDir = path.join(this.baseDir, campaignId);
		return {
			coreRules: path.join(campaignDir, 'core_rules'),
			textbooks: path.join(campaignDir, 'textbooks'),
			characters: path.join(campaignDir, 'characters'),
			sessionRecaps: path.join(campaignDir, 'session_recaps'),
			generalNotes: path.join(campaignDir, 'general_notes'),
			gmNotes: path.join(campaignDir, 'gm_notes')
		};
	}

	public async ensureCampaignDirectoryStructure(campaignId: string): Promise<CampaignDirectoryStructure> {
		logger.debug('[CampaignFileService] Ensuring campaign directory structure...', { campaignId });

		const structure = this.getCampaignDirectoryStructure(campaignId);

		try {
			// Create all directories
			await Promise.all([
				fs.mkdir(structure.coreRules, { recursive: true }),
				fs.mkdir(structure.textbooks, { recursive: true }),
				fs.mkdir(structure.characters, { recursive: true }),
				fs.mkdir(structure.sessionRecaps, { recursive: true }),
				fs.mkdir(structure.generalNotes, { recursive: true }),
				fs.mkdir(structure.gmNotes, { recursive: true })
			]);

			logger.info('[CampaignFileService] Campaign directory structure created successfully', { campaignId });
			return structure;
		} catch (error) {
			logger.error('[CampaignFileService] Error creating campaign directory structure:', error);
			throw new Error('Failed to create campaign directory structure');
		}
	}

	public async validateDirectoryStructure(campaignId: string): Promise<boolean> {
		logger.debug('[CampaignFileService] Validating campaign directory structure...', { campaignId });

		const structure = this.getCampaignDirectoryStructure(campaignId);

		try {
			// Check if all directories exist
			await Promise.all([
				fs.access(structure.coreRules),
				fs.access(structure.textbooks),
				fs.access(structure.characters),
				fs.access(structure.sessionRecaps),
				fs.access(structure.generalNotes),
				fs.access(structure.gmNotes)
			]);

			logger.info('[CampaignFileService] Campaign directory structure is valid', { campaignId });
			return true;
		} catch (error) {
			logger.debug('[CampaignFileService] Campaign directory structure is invalid or missing', { campaignId });
			return false;
		}
	}
}
