import { spawn } from 'child_process';
import * as path from 'path';
import { logger } from '../../services/logger';
import { CampaignFileService } from './campaignFileService';

export interface VectorGenerationOptions {
	includeGMContent: boolean;
	modelName?: string;
	chunkSize?: number;
}

export class VectorService {
	private static instance: VectorService;
	private fileService: CampaignFileService;
	private contextDir: string;

	private constructor() {
		this.fileService = CampaignFileService.getInstance();
		this.contextDir = process.env.VECTOR_CONTEXT_DIR || path.join(process.cwd(), 'data', 'llm_context');
	}

	public static getInstance(): VectorService {
		if (!VectorService.instance) {
			VectorService.instance = new VectorService();
		}
		return VectorService.instance;
	}

	public async generateVectors(campaignId: string, options: VectorGenerationOptions): Promise<void> {
		logger.debug('[VectorService] Starting vector generation...', {
			campaignId,
			includeGMContent: options.includeGMContent
		});

		try {
			// Ensure campaign directory exists
			await this.fileService.ensureCampaignDirectoryStructure(campaignId);

			// Create campaign-specific context directory
			const campaignContextDir = path.join(this.contextDir, campaignId);

			// Prepare script arguments
			const scriptPath = path.join(process.cwd(), 'scripts', 'generate_vectors.py');
			const args = [
				scriptPath,
				'--campaign-dir', path.join(this.fileService.getCampaignBasePath(), campaignId),
				'--context-dir', campaignContextDir,
				'--include-gm', options.includeGMContent ? 'true' : 'false'
			];

			if (options.modelName) {
				args.push('--model-name', options.modelName);
			}
			if (options.chunkSize) {
				args.push('--chunk-size', options.chunkSize.toString());
			}

			logger.debug('[VectorService] Spawning vector generation process...', { args });

			return new Promise((resolve, reject) => {
				const process = spawn('python3', args);

				process.stdout.on('data', (data) => {
					logger.debug('[VectorService] Vector generation output:', data.toString());
				});

				process.stderr.on('data', (data) => {
					logger.error('[VectorService] Vector generation error:', data.toString());
				});

				process.on('close', (code) => {
					if (code === 0) {
						logger.info('[VectorService] Vector generation completed successfully');
						resolve();
					} else {
						const error = new Error(`Vector generation failed with code ${code}`);
						logger.error('[VectorService] Vector generation failed:', error);
						reject(error);
					}
				});

				process.on('error', (error) => {
					logger.error('[VectorService] Failed to start vector generation:', error);
					reject(error);
				});
			});
		} catch (error) {
			logger.error('[VectorService] Error in vector generation:', error instanceof Error ? error : new Error(String(error)));
			throw new Error('Failed to generate vectors');
		}
	}

	public async getVectorMetadata(campaignId: string): Promise<any> {
		try {
			const metadataPath = path.join(this.contextDir, campaignId, 'metadata.json');
			const content = await this.fileService.readFromDirectory(metadataPath);
			return content ? JSON.parse(content) : null;
		} catch (error) {
			logger.error('[VectorService] Error reading vector metadata:', error instanceof Error ? error : new Error(String(error)));
			return null;
		}
	}

	public async clearVectors(campaignId: string): Promise<void> {
		try {
			const campaignContextDir = path.join(this.contextDir, campaignId);
			await this.fileService.deleteDirectory(campaignContextDir);
			logger.info('[VectorService] Successfully cleared vectors for campaign', { campaignId });
		} catch (error) {
			logger.error('[VectorService] Error clearing vectors:', error instanceof Error ? error : new Error(String(error)));
			throw new Error('Failed to clear vectors');
		}
	}
}
