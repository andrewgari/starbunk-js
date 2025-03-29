import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../../services/logger';
import { CampaignFileService } from './campaignFileService';
import { VectorEmbeddingService } from './vectorEmbeddingService';

export interface VectorServiceErrorDetails {
	error: string;
	status?: string;
	code?: number | null;
}

export class VectorServiceError extends Error {
	constructor(
		message: string,
		public readonly details: VectorServiceErrorDetails
	) {
		super(message);
		this.name = 'VectorServiceError';
	}

	static fromError(message: string, error: unknown): VectorServiceError {
		return new VectorServiceError(message, {
			error: error instanceof Error ? error.message : String(error),
			status: 'error'
		});
	}
}

export interface VectorGenerationOptions {
	includeGMContent: boolean;
	modelName?: string;
	chunkSize?: number;
	namespace?: string;
}

export interface VectorMetadata {
	file: string;
	is_gm_content: boolean;
	chunk_size: number;
}

export interface VectorSearchResult {
	text: string;
	metadata: VectorMetadata;
	similarity: number;
}

export interface TextWithMetadata {
	text: string;
	metadata: VectorMetadata;
}

export class VectorService {
	private static instance: VectorService | null = null;
	private readonly fileService: CampaignFileService;
	private readonly contextDir: string;
	private readonly embeddingService: VectorEmbeddingService;

	private constructor() {
		this.fileService = CampaignFileService.getInstance();
		this.embeddingService = VectorEmbeddingService.getInstance();
		this.contextDir = process.env.VECTOR_CONTEXT_DIR || path.join(process.cwd(), 'data', 'llm_context');
	}

	public static getInstance(): VectorService {
		if (!VectorService.instance) {
			VectorService.instance = new VectorService();
		}
		return VectorService.instance;
	}

	/**
	 * Generate vector embeddings for a directory
	 */
	public async generateVectorsFromDirectory(
		directory: string,
		options: {
			isGMContent?: boolean;
			outputDir: string;
			modelName?: string;
			chunkSize?: number;
			namespace?: string;
		}
	): Promise<void> {
		try {
			logger.info('[VectorService] Generating vectors from directory...', {
				directory,
				isGMContent: options.isGMContent || false,
				namespace: options.namespace
			});

			// Initialize with the specified model if provided
			if (options.modelName) {
				await this.embeddingService.initialize(options.modelName);
			} else {
				await this.embeddingService.initialize();
			}

			// Process the directory to get content with metadata
			const contentWithMetadata = await this.embeddingService.processDirectory(
				directory,
				options.isGMContent || false,
				options.chunkSize || 512
			);

			if (contentWithMetadata.length === 0) {
				logger.warn('[VectorService] No content found in directory', { directory });
				return;
			}

			// Extract texts and metadata
			const texts = contentWithMetadata.map(item => item.text);
			const metadata = contentWithMetadata.map(item => item.metadata);

			// Generate embeddings
			logger.info('[VectorService] Generating embeddings for texts...', { count: texts.length });
			const embeddings = await this.embeddingService.generateEmbeddings(texts);

			// Ensure output directory exists
			const outputDirPath = options.namespace
				? path.join(options.outputDir, options.namespace)
				: options.outputDir;

			// Save vectors, metadata, and texts
			await this.embeddingService.saveVectors(embeddings, metadata, texts, outputDirPath);

			logger.info('[VectorService] Vector generation completed', {
				directory,
				outputDir: outputDirPath,
				textCount: texts.length,
				embeddingCount: embeddings.length
			});
		} catch (error) {
			throw VectorServiceError.fromError('Failed to generate vectors from directory', error);
		}
	}

	public async generateVectors(
		campaignId: string,
		options: VectorGenerationOptions = { includeGMContent: false }
	): Promise<void> {
		logger.debug('[VectorService] Starting vector generation...', {
			campaignId,
			includeGMContent: options.includeGMContent
		});

		try {
			await this.fileService.ensureCampaignDirectoryStructure(campaignId);
			const campaignContextDir = path.join(this.contextDir, campaignId);
			const campaignBasePath = path.join(this.fileService.getCampaignBasePath(), campaignId);

			// Always process player content
			const playerDir = path.join(campaignBasePath, 'player');
			if (await this.directoryExists(playerDir)) {
				await this.generateVectorsFromDirectory(playerDir, {
					isGMContent: false,
					outputDir: campaignContextDir,
					...(options.modelName && { modelName: options.modelName }),
					...(options.chunkSize && { chunkSize: options.chunkSize }),
					...(options.namespace && { namespace: options.namespace })
				});
			}

			// Process GM content if requested
			if (options.includeGMContent) {
				const gmDir = path.join(campaignBasePath, 'gm');
				if (await this.directoryExists(gmDir)) {
					await this.generateVectorsFromDirectory(gmDir, {
						isGMContent: true,
						outputDir: campaignContextDir,
						...(options.modelName && { modelName: options.modelName }),
						...(options.chunkSize && { chunkSize: options.chunkSize }),
						...(options.namespace && { namespace: options.namespace })
					});
				}
			}

			logger.info('[VectorService] Vector generation completed for campaign', { campaignId });
		} catch (error) {
			throw VectorServiceError.fromError('Failed to generate vectors', error);
		}
	}

	private async directoryExists(directory: string): Promise<boolean> {
		try {
			const stats = await fs.stat(directory);
			return stats.isDirectory();
		} catch {
			return false;
		}
	}

	public async generateVectorsFromTexts(
		namespace: string,
		texts: readonly TextWithMetadata[]
	): Promise<void> {
		try {
			const contextDir = path.join(process.cwd(), 'data', 'vectors', namespace);
			await fs.mkdir(contextDir, { recursive: true });

			const textContents = texts.map(item => item.text);
			const metadata = texts.map(item => item.metadata);

			// Generate embeddings
			const embeddings = await this.embeddingService.generateEmbeddings(textContents);

			// Save vectors, metadata, and texts
			await this.embeddingService.saveVectors(embeddings, metadata, textContents, contextDir);

			logger.info('[VectorService] Vector generation completed for texts', {
				namespace,
				textCount: texts.length
			});
		} catch (error) {
			throw VectorServiceError.fromError('Failed to generate vectors from texts', error);
		}
	}

	public async findSimilarTexts(
		namespace: string,
		query: string,
		limit = 5
	): Promise<VectorSearchResult[]> {
		try {
			const contextDir = path.join(process.cwd(), 'data', 'vectors', namespace);

			// Load vectors, metadata, and texts
			const { vectors, metadata, texts } = await this.embeddingService.loadVectors(contextDir);

			// Generate query vector
			const queryVector = (await this.embeddingService.generateEmbeddings([query]))[0];

			// Calculate similarities
			const similarities = vectors.map((vec: Float32Array) => this.embeddingService.calculateCosineSimilarity(vec, queryVector));

			// Get top k results
			const topIndices = this.getTopKIndices(similarities, limit);

			// Format results
			return topIndices.map(idx => ({
				text: texts[idx],
				metadata: metadata[idx],
				similarity: similarities[idx]
			}));
		} catch (error) {
			throw VectorServiceError.fromError('Failed to find similar texts', error);
		}
	}

	private getTopKIndices(arr: number[], k: number): number[] {
		return arr
			.map((value, index) => ({ value, index }))
			.sort((a, b) => b.value - a.value)
			.slice(0, k)
			.map(item => item.index);
	}

	public async vectorizeCampaignContent(
		campaignId: string,
		options: VectorGenerationOptions = { includeGMContent: false }
	): Promise<void> {
		try {
			await this.generateVectors(campaignId, options);
		} catch (error) {
			throw VectorServiceError.fromError('Failed to vectorize campaign content', error);
		}
	}

	public async searchCampaignContent(
		campaignId: string,
		query: string,
		hasGMAccess: boolean,
		limit = 5
	): Promise<readonly VectorSearchResult[]> {
		try {
			const results = await this.findSimilarTexts(campaignId, query, limit);

			// Filter out GM content if user doesn't have access
			if (!hasGMAccess) {
				return results.filter(result => !result.metadata.is_gm_content);
			}

			return results;
		} catch (error) {
			throw VectorServiceError.fromError('Failed to search campaign content', error);
		}
	}
}
