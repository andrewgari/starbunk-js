import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../../services/logger';

interface DirectoryWithAccess {
	gm: string;
	player: string;
}

export interface CampaignDirectoryStructure {
	coreRules: DirectoryWithAccess;
	textbooks: DirectoryWithAccess;
	characters: DirectoryWithAccess;
	sessionRecaps: DirectoryWithAccess;
	notes: DirectoryWithAccess;
	vectors: DirectoryWithAccess;
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

	public getCampaignBasePath(): string {
		return this.baseDir;
	}

	private createAccessStructure(basePath: string): DirectoryWithAccess {
		return {
			gm: path.join(basePath, 'gm'),
			player: path.join(basePath, 'player')
		};
	}

	public getCampaignDirectoryStructure(campaignId: string): CampaignDirectoryStructure {
		const campaignDir = path.join(this.baseDir, campaignId);

		return {
			coreRules: this.createAccessStructure(path.join(campaignDir, 'core_rules')),
			textbooks: this.createAccessStructure(path.join(campaignDir, 'textbooks')),
			characters: this.createAccessStructure(path.join(campaignDir, 'characters')),
			sessionRecaps: this.createAccessStructure(path.join(campaignDir, 'session_recaps')),
			notes: this.createAccessStructure(path.join(campaignDir, 'notes')),
			vectors: this.createAccessStructure(path.join(campaignDir, 'vectors'))
		};
	}

	public async ensureCampaignDirectoryStructure(campaignId: string): Promise<CampaignDirectoryStructure> {
		logger.debug('[CampaignFileService] Ensuring campaign directory structure...', { campaignId });

		const structure = this.getCampaignDirectoryStructure(campaignId);

		try {
			// Create all directories with their GM and player subdirectories
			await Promise.all([
				// Core Rules
				fs.mkdir(structure.coreRules.gm, { recursive: true }),
				fs.mkdir(structure.coreRules.player, { recursive: true }),

				// Textbooks
				fs.mkdir(structure.textbooks.gm, { recursive: true }),
				fs.mkdir(structure.textbooks.player, { recursive: true }),

				// Characters
				fs.mkdir(structure.characters.gm, { recursive: true }),
				fs.mkdir(structure.characters.player, { recursive: true }),

				// Session Recaps
				fs.mkdir(structure.sessionRecaps.gm, { recursive: true }),
				fs.mkdir(structure.sessionRecaps.player, { recursive: true }),

				// Notes
				fs.mkdir(structure.notes.gm, { recursive: true }),
				fs.mkdir(structure.notes.player, { recursive: true }),
				
				// Vector embeddings
				fs.mkdir(structure.vectors.gm, { recursive: true }),
				fs.mkdir(structure.vectors.player, { recursive: true })
			]);

			logger.info('[CampaignFileService] Campaign directory structure created successfully', { campaignId });
			return structure;
		} catch (error: unknown) {
			logger.error('[CampaignFileService] Error creating campaign directory structure:', error instanceof Error ? error : new Error(String(error)));
			throw new Error('Failed to create campaign directory structure');
		}
	}

	public async validateDirectoryStructure(campaignId: string): Promise<boolean> {
		logger.debug('[CampaignFileService] Validating campaign directory structure...', { campaignId });

		const structure = this.getCampaignDirectoryStructure(campaignId);

		try {
			// Check if all directories exist
			await Promise.all([
				// Core Rules
				fs.access(structure.coreRules.gm),
				fs.access(structure.coreRules.player),

				// Textbooks
				fs.access(structure.textbooks.gm),
				fs.access(structure.textbooks.player),

				// Characters
				fs.access(structure.characters.gm),
				fs.access(structure.characters.player),

				// Session Recaps
				fs.access(structure.sessionRecaps.gm),
				fs.access(structure.sessionRecaps.player),

				// Notes
				fs.access(structure.notes.gm),
				fs.access(structure.notes.player),
				
				// Vectors
				fs.access(structure.vectors.gm),
				fs.access(structure.vectors.player)
			]);

			logger.info('[CampaignFileService] Campaign directory structure is valid', { campaignId });
			return true;
		} catch (_error) {
			logger.debug('[CampaignFileService] Campaign directory structure is invalid or missing', { campaignId });
			return false;
		}
	}

	public getNotePath(campaignId: string, isGM: boolean): string {
		const structure = this.getCampaignDirectoryStructure(campaignId);
		return isGM ? structure.notes.gm : structure.notes.player;
	}
	
	public getVectorPath(campaignId: string, isGM: boolean): string {
		const structure = this.getCampaignDirectoryStructure(campaignId);
		return isGM ? structure.vectors.gm : structure.vectors.player;
	}

	public async saveToDirectory(filePath: string, content: string): Promise<void> {
		try {
			await fs.writeFile(filePath, content, 'utf-8');
			logger.debug('[CampaignFileService] Successfully wrote file:', { filePath });
		} catch (error: unknown) {
			logger.error('[CampaignFileService] Error writing file:', error instanceof Error ? error : new Error(String(error)));
			throw new Error(`Failed to write file to ${filePath}`);
		}
	}

	public async readFromDirectory(filePath: string): Promise<string> {
		try {
			const content = await fs.readFile(filePath, 'utf-8');
			logger.debug('[CampaignFileService] Successfully read file:', { filePath });
			return content;
		} catch (error: unknown) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
				return '';
			}
			logger.error('[CampaignFileService] Error reading file:', error instanceof Error ? error : new Error(String(error)));
			throw new Error(`Failed to read file from ${filePath}`);
		}
	}

	public async listFiles(directoryPath: string): Promise<string[]> {
		try {
			const files = await fs.readdir(directoryPath);
			logger.debug('[CampaignFileService] Successfully listed files:', { directoryPath, count: files.length });
			return files;
		} catch (error: unknown) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
				return [];
			}
			logger.error('[CampaignFileService] Error listing files:', error instanceof Error ? error : new Error(String(error)));
			throw new Error(`Failed to list files in ${directoryPath}`);
		}
	}

	public async deleteDirectory(directoryPath: string): Promise<void> {
		try {
			await fs.rm(directoryPath, { recursive: true, force: true });
			logger.debug('[CampaignFileService] Successfully deleted directory:', { directoryPath });
		} catch (error: unknown) {
			logger.error('[CampaignFileService] Error deleting directory:', error instanceof Error ? error : new Error(String(error)));
			throw new Error(`Failed to delete directory ${directoryPath}`);
		}
	}
}
