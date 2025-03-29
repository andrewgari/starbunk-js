import fs from 'fs/promises';
import path from 'path';
import { logger } from '../../services/logger';
import { TextWithMetadata } from '../types/text';
import { CampaignFileService } from './campaignFileService';
import { VectorEmbeddingService } from './vectorEmbeddingService';

export interface VectorMetadata {
	file: string;
	is_gm_content: boolean;
	chunk_size: number;
}

export interface VectorServiceErrorDetails {
	error: string;
	status?: string;
	code?: number | null;
	directory?: string;
	campaignId?: string;
	namespace?: string;
	stack?: string;
}

export class VectorServiceError extends Error {
	constructor(
		message: string,
		public readonly details: VectorServiceErrorDetails
	) {
		super(message);
		this.name = 'VectorServiceError';
	}

	static fromError(message: string, error: unknown, additionalDetails: Partial<VectorServiceErrorDetails> = {}): VectorServiceError {
		return new VectorServiceError(message, {
			error: error instanceof Error ? error.message : String(error),
			status: 'error',
			stack: error instanceof Error ? error.stack : undefined,
			...additionalDetails
		});
	}
}

export interface VectorGenerationOptions {
	includeGMContent: boolean;
	modelName?: string;
	chunkSize?: number;
	namespace?: string;
}

export interface VectorSearchResult {
	text: string;
	metadata: VectorMetadata;
	similarity: number;
}

export class VectorService {
	private static instance: VectorService | null = null;
	private readonly fileService: CampaignFileService;
	private readonly contextDir: string;
	private readonly embeddingService: VectorEmbeddingService;
	private readonly outputDir: string;

	private constructor() {
		this.fileService = CampaignFileService.getInstance();
		this.embeddingService = VectorEmbeddingService.getInstance();
		// Default fallback directories
		this.contextDir = process.env.VECTOR_CONTEXT_DIR || path.join(process.cwd(), 'data', 'vectors');
		this.outputDir = process.env.VECTOR_OUTPUT_DIR || path.join(process.cwd(), 'data', 'vectors');

		logger.debug('[VectorService] Initialized with paths', {
			contextDir: this.contextDir,
			outputDir: this.outputDir
		});
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
			logger.info('[VectorService] 📂 Generating vectors from directory...', {
				directory,
				isGMContent: options.isGMContent || false,
				namespace: options.namespace,
				modelName: options.modelName,
				chunkSize: options.chunkSize
			});

			// Initialize with the specified model if provided
			logger.debug('[VectorService] 🧠 Initializing embedding model...', {
				modelName: options.modelName || 'default'
			});

			if (options.modelName) {
				await this.embeddingService.initialize(options.modelName);
			} else {
				await this.embeddingService.initialize();
			}

			logger.debug('[VectorService] ✅ Embedding model initialized', {
				modelName: this.embeddingService.getModelName()
			});

			// Process the directory to get content with metadata
			logger.debug('[VectorService] 📄 Processing directory content...', { directory });
			const contentWithMetadata = await this.embeddingService.processDirectory(
				directory,
				options.isGMContent || false,
				options.chunkSize || 512
			);

			if (contentWithMetadata.length === 0) {
				logger.warn('[VectorService] ⚠️ No content found in directory', { directory });
				return;
			}

			logger.info('[VectorService] 📊 Content processed', {
				textCount: contentWithMetadata.length,
				directory,
				firstSample: contentWithMetadata[0]?.text.substring(0, 100) + '...'
			});

			// Extract texts and metadata
			const texts = contentWithMetadata.map(item => item.text);
			const metadata = contentWithMetadata.map(item => item.metadata);

			// Generate embeddings
			logger.info('[VectorService] 🔍 Generating embeddings for texts...', {
				count: texts.length,
				averageLength: texts.reduce((sum, text) => sum + text.length, 0) / texts.length
			});

			const embeddings = await this.embeddingService.generateEmbeddings(texts);

			logger.debug('[VectorService] ✅ Embeddings generated', {
				count: embeddings.length,
				dimensions: embeddings[0]?.length || 0
			});

			// Convert Float32Array to regular arrays
			const embeddingsArray = embeddings.map(embedding => Array.from(embedding));

			// Ensure output directory exists
			const outputDirPath = options.namespace
				? path.join(options.outputDir, options.namespace)
				: options.outputDir;

			logger.debug('[VectorService] 📁 Ensuring output directory exists', { outputDirPath });
			await fs.mkdir(outputDirPath, { recursive: true });

			// Save vectors, metadata, and texts
			logger.info('[VectorService] 💾 Saving vectors, metadata, and texts...', {
				outputDir: outputDirPath,
				vectorCount: embeddingsArray.length
			});

			await this.embeddingService.saveVectors(embeddingsArray, metadata, texts, outputDirPath);

			logger.info('[VectorService] ✅ Vector generation completed', {
				directory,
				outputDir: outputDirPath,
				textCount: texts.length,
				embeddingCount: embeddings.length
			});
		} catch (error) {
			logger.error(
				'[VectorService] ❌ Error generating vectors from directory',
				error instanceof Error ? error : new Error(String(error)),
				{ directory }
			);
			throw VectorServiceError.fromError('Failed to generate vectors from directory', error, { directory });
		}
	}

	public async generateVectors(
		campaignId: string,
		options: VectorGenerationOptions = { includeGMContent: false }
	): Promise<void> {
		logger.debug('[VectorService] 🚀 Starting vector generation...', {
			campaignId,
			includeGMContent: options.includeGMContent,
			modelName: options.modelName,
			chunkSize: options.chunkSize,
			namespace: options.namespace
		});

		try {
			// Ensure campaign directory structure exists with vector folders
			logger.debug('[VectorService] 📁 Ensuring campaign directory structure...', { campaignId });
			await this.fileService.ensureCampaignDirectoryStructure(campaignId);

			// Get the campaign-specific vector directories
			const _playerVectorDir = this.fileService.getVectorPath(campaignId, false);
			const _gmVectorDir = this.fileService.getVectorPath(campaignId, true);

			logger.debug('[VectorService] 📂 Vector directories prepared', {
				playerVectorDir: _playerVectorDir,
				gmVectorDir: _gmVectorDir,
				campaignId
			});

			// Ensure vector directories exist
			await fs.mkdir(_playerVectorDir, { recursive: true });
			await fs.mkdir(_gmVectorDir, { recursive: true });

			const campaignBasePath = path.join(this.fileService.getCampaignBasePath(), campaignId);
			logger.debug('[VectorService] 📂 Campaign base path', { campaignBasePath });

			// Always process player content
			const _playerDir = path.join(campaignBasePath, 'player');
			if (await this.directoryExists(_playerDir)) {
				logger.info('[VectorService] 🧑‍🤝‍🧑 Processing player content...', { playerDir: _playerDir });

				await this.generateVectorsFromDirectory(_playerDir, {
					isGMContent: false,
					outputDir: _playerVectorDir,
					modelName: options.modelName,
					chunkSize: options.chunkSize,
					namespace: options.namespace || 'player'
				});

				logger.info('[VectorService] ✅ Player content processing complete', { playerDir: _playerDir });
			} else {
				logger.warn('[VectorService] ⚠️ Player directory not found', { playerDir: _playerDir });
			}

			// Process GM content if requested
			if (options.includeGMContent) {
				const _gmDir = path.join(campaignBasePath, 'gm');
				if (await this.directoryExists(_gmDir)) {
					logger.info('[VectorService] 🧙‍♂️ Processing GM content...', { gmDir: _gmDir });

					await this.generateVectorsFromDirectory(_gmDir, {
						isGMContent: true,
						outputDir: _gmVectorDir,
						modelName: options.modelName,
						chunkSize: options.chunkSize,
						namespace: options.namespace || 'gm'
					});

					logger.info('[VectorService] ✅ GM content processing complete', { gmDir: _gmDir });
				} else {
					logger.warn('[VectorService] ⚠️ GM directory not found', { gmDir: _gmDir });
				}
			} else {
				logger.debug('[VectorService] 🔒 Skipping GM content (not requested)', { campaignId });
			}

			logger.info('[VectorService] 🏁 Vector generation completed for campaign', { campaignId });

			// Verify vector files
			const vectorFiles = await fs.readdir(_playerVectorDir);
			logger.info('[VectorService] 📊 Vector files found', {
				count: vectorFiles.length,
				files: vectorFiles
			});
		} catch (error) {
			logger.error(
				'[VectorService] ❌ Error generating vectors',
				error instanceof Error ? error : new Error(String(error)),
				{ campaignId }
			);
			throw VectorServiceError.fromError('Failed to generate vectors', error, { campaignId });
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
			logger.debug('[VectorService] 🚀 Starting vector generation process', {
				namespace,
				textCount: texts.length,
				totalTextLength: texts.reduce((sum, t) => sum + t.text.length, 0),
				averageTextLength: texts.reduce((sum, t) => sum + t.text.length, 0) / texts.length,
				metadata: texts.map(t => t.metadata)
			});

			const contextDir = path.join(this.outputDir, namespace);
			logger.debug('[VectorService] 📁 Ensuring output directory exists', {
				contextDir,
				namespace
			});

			await fs.mkdir(contextDir, { recursive: true });
			logger.info('[VectorService] ✅ Output directory ready', { contextDir });

			const textContents = texts.map(item => item.text);
			const metadata = texts.map(item => item.metadata);

			// Initialize embedding service if needed
			logger.debug('[VectorService] 🧠 Checking embedding service initialization...');
			if (!this.embeddingService.isInitialized()) {
				logger.info('[VectorService] 🔄 Initializing embedding service...');
				await this.embeddingService.initialize();
			}

			// Generate embeddings
			logger.debug('[VectorService] 🔍 Starting embedding generation', {
				textCount: textContents.length,
				modelName: this.embeddingService.getModelName()
			});

			const embeddings = await this.embeddingService.generateEmbeddings(textContents);
			logger.info('[VectorService] ✅ Embeddings generated successfully', {
				embeddingCount: embeddings.length,
				embeddingDimensions: embeddings[0]?.length || 0
			});

			// Convert Float32Array to regular arrays
			logger.debug('[VectorService] 🔄 Converting embeddings to regular arrays...');
			const embeddingsArray = embeddings.map(embedding => Array.from(embedding));

			// Save vectors, metadata, and texts
			logger.debug('[VectorService] 💾 Saving vectors to disk', {
				contextDir,
				vectorCount: embeddingsArray.length,
				metadataCount: metadata.length,
				textCount: textContents.length
			});

			await this.embeddingService.saveVectors(embeddingsArray, metadata, textContents, contextDir);

			// Verify saved files
			const vectorsPath = path.join(contextDir, 'vectors.npy');
			const metadataPath = path.join(contextDir, 'metadata.json');
			const textsPath = path.join(contextDir, 'texts.json');

			const [vectorsExist, metadataExists, textsExist] = await Promise.all([
				fs.access(vectorsPath).then(() => true).catch(() => false),
				fs.access(metadataPath).then(() => true).catch(() => false),
				fs.access(textsPath).then(() => true).catch(() => false)
			]);

			logger.info('[VectorService] 🏁 Vector generation completed', {
				namespace,
				textCount: texts.length,
				filesCreated: {
					vectors: vectorsExist,
					metadata: metadataExists,
					texts: textsExist
				},
				paths: {
					vectors: vectorsPath,
					metadata: metadataPath,
					texts: textsPath
				}
			});
		} catch (error) {
			logger.error(
				'[VectorService] ❌ Error generating vectors from texts',
				error instanceof Error ? error : new Error(String(error)),
				{ namespace }
			);
			throw VectorServiceError.fromError('Failed to generate vectors from texts', error, { namespace });
		}
	}

	private logError(message: string, error: unknown, context: Record<string, unknown> = {}): void {
		const errorObj = error instanceof Error ? error : new Error(String(error));
		logger.error(message, errorObj, context);
	}

	public async findSimilarTexts(
		namespace: string,
		query: string,
		options: { limit?: number } = {}
	): Promise<VectorSearchResult[]> {
		try {
			let contextDir;

			// Check if this is a campaign/role path or a direct path
			if (namespace.includes('/')) {
				// It's a campaign ID with a role (e.g., "campaign-id/gm")
				const [campaignId, role] = namespace.split('/');
				const isGM = role === 'gm';
				contextDir = this.fileService.getVectorPath(campaignId, isGM);
			} else {
				// Use the direct path as before
				contextDir = path.join(this.outputDir, namespace);
			}

			logger.debug('[VectorService] 🔍 Finding similar texts', {
				namespace,
				contextDir,
				query: query.substring(0, 30) + (query.length > 30 ? '...' : '')
			});

			// Load vectors, metadata, and texts
			logger.debug('[VectorService] 📂 Loading vectors from disk...', { contextDir });
			const { vectors, metadata, texts } = await this.embeddingService.loadVectors(contextDir);

			logger.debug('[VectorService] ✅ Vectors loaded successfully', {
				vectorCount: vectors.length,
				metadataCount: metadata.length,
				textCount: texts.length
			});

			// Generate query vector
			logger.debug('[VectorService] 🧠 Generating embedding for query...');
			const queryVector = (await this.embeddingService.generateEmbeddings([query]))[0];

			// Calculate similarities
			logger.debug('[VectorService] 📊 Calculating similarities...');
			const similarities = vectors.map((vec: Float32Array) => this.embeddingService.calculateCosineSimilarity(vec, queryVector));

			// Get top k results
			const topIndices = this.getTopKIndices(similarities, options.limit || 5);

			logger.debug('[VectorService] 🏆 Top results found', {
				resultCount: topIndices.length,
				topSimilarities: topIndices.map(idx => similarities[idx])
			});

			// Format results
			const results = topIndices.map(idx => ({
				text: texts[idx],
				metadata: metadata[idx],
				similarity: similarities[idx]
			}));

			logger.info('[VectorService] ✅ Similar texts search completed', {
				namespace,
				query: query.substring(0, 30) + (query.length > 30 ? '...' : ''),
				resultCount: results.length,
				topSimilarity: results.length > 0 ? results[0].similarity : 0
			});

			return results;
		} catch (error) {
			this.logError('[VectorService] ❌ Error finding similar texts', error, { namespace });
			throw VectorServiceError.fromError('Failed to find similar texts', error, { namespace });
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
			logger.info('[VectorService] 🚀 Starting campaign content vectorization', {
				campaignId,
				includeGMContent: options.includeGMContent,
				modelName: options.modelName,
				chunkSize: options.chunkSize
			});

			await this.generateVectors(campaignId, options);

			logger.info('[VectorService] ✅ Campaign content vectorization completed', { campaignId });
		} catch (error) {
			this.logError('[VectorService] ❌ Error vectorizing campaign content', error, { campaignId });
			throw VectorServiceError.fromError('Failed to vectorize campaign content', error, { campaignId });
		}
	}

	public async searchCampaignContent(
		campaignId: string,
		query: string,
		options: { limit?: number; includeGMContent?: boolean } = {}
	): Promise<VectorSearchResult[]> {
		try {
			logger.info('[VectorService] 🔍 Searching campaign content', {
				campaignId,
				query: query.substring(0, 30) + (query.length > 30 ? '...' : ''),
				includeGMContent: options.includeGMContent,
				limit: options.limit
			});

			// Get the player vectors directory
			const _playerVectorDir = this.fileService.getVectorPath(campaignId, false);
			let allResults: VectorSearchResult[] = [];

			// Always search player content
			try {
				logger.debug('[VectorService] 🧑‍🤝‍🧑 Searching player vectors...', { campaignId });
				const playerResults = await this.findSimilarTexts(`${campaignId}/player`, query, { limit: options.limit });
				allResults = allResults.concat(playerResults);
				logger.debug('[VectorService] ✅ Player search complete', {
					resultCount: playerResults.length,
					campaignId
				});
			} catch (playerError) {
				logger.warn('[VectorService] ⚠️ Error searching player vectors', {
					campaignId,
					error: playerError instanceof Error ? playerError.message : String(playerError)
				});
			}

			// Search GM content if user has access
			if (options.includeGMContent) {
				try {
					logger.debug('[VectorService] 🧙‍♂️ Searching GM vectors...', { campaignId });
					const gmResults = await this.findSimilarTexts(`${campaignId}/gm`, query, { limit: options.limit });
					allResults = allResults.concat(gmResults);
					logger.debug('[VectorService] ✅ GM search complete', {
						resultCount: gmResults.length,
						campaignId
					});
				} catch (gmError) {
					logger.warn('[VectorService] ⚠️ Error searching GM vectors', {
						campaignId,
						error: gmError instanceof Error ? gmError.message : String(gmError)
					});
				}
			} else {
				logger.debug('[VectorService] 🔒 Skipping GM vectors (no access)', { campaignId });
			}

			// Sort by similarity and limit results
			const sortedResults = allResults
				.sort((a, b) => b.similarity - a.similarity)
				.slice(0, options.limit || 5);

			logger.info('[VectorService] ✅ Campaign content search completed', {
				campaignId,
				totalResultCount: allResults.length,
				returnedResultCount: sortedResults.length,
				topSimilarity: sortedResults.length > 0 ? sortedResults[0].similarity : 0
			});

			return sortedResults;
		} catch (error) {
			this.logError('[VectorService] ❌ Error searching campaign content', error, { campaignId });
			throw VectorServiceError.fromError('Failed to search campaign content', error, { campaignId });
		}
	}
}
