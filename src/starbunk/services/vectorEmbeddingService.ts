import { pipeline } from '@xenova/transformers';
import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../../services/logger';
import { TextWithMetadata, VectorMetadata } from './vectorService';

export interface LoadedVectors {
	vectors: Float32Array[];
	metadata: VectorMetadata[];
	texts: string[];
}

/**
 * Service for generating vector embeddings from text using TypeScript
 */
export class VectorEmbeddingService {
	private static instance: VectorEmbeddingService | null = null;
	private modelName: string;
	private embeddingPipeline: any = null;
	private initialized: boolean = false;
	private initPromise: Promise<void> | null = null;

	private constructor() {
		// Default model to use for embeddings

		this.modelName = 'Xenova/all-MiniLM-L6-v2';
	}

	public static getInstance(): VectorEmbeddingService {
		if (!VectorEmbeddingService.instance) {
			VectorEmbeddingService.instance = new VectorEmbeddingService();
		}
		return VectorEmbeddingService.instance;
	}

	/**
	 * Initialize the embedding pipeline
	 */
	public async initialize(modelName?: string): Promise<void> {
		if (this.initialized) return;

		if (this.initPromise) {
			return this.initPromise;
		}

		this.initPromise = (async () => {
			try {
				if (modelName) {
					this.modelName = modelName;
				}

				logger.info('[VectorEmbeddingService] Initializing embedding pipeline with model:', { model: this.modelName });
				this.embeddingPipeline = await pipeline('feature-extraction', this.modelName);
				this.initialized = true;
				logger.info('[VectorEmbeddingService] Embedding pipeline initialized successfully');
			} catch (error) {
				logger.error('[VectorEmbeddingService] Failed to initialize embedding pipeline:', error instanceof Error ? error : new Error(String(error)));
				throw new Error(`Failed to initialize embedding pipeline: ${error}`);
			}
		})();

		return this.initPromise;
	}

	/**
	 * Generate embeddings for a list of texts
	 */
	public async generateEmbeddings(texts: string[]): Promise<Float32Array[]> {
		if (!this.initialized) {
			await this.initialize();
		}

		try {
			const embeddings: Float32Array[] = [];

			// Process in batches to avoid memory issues
			const batchSize = 32;
			for (let i = 0; i < texts.length; i += batchSize) {
				const batch = texts.slice(i, i + batchSize);
				logger.debug(`[VectorEmbeddingService] Processing batch ${i / batchSize + 1}/${Math.ceil(texts.length / batchSize)}`);

				const results = await Promise.all(
					batch.map(async (text) => {
						const output = await this.embeddingPipeline(text, {
							pooling: 'mean',
							normalize: true
						});
						return output.data;
					})
				);

				embeddings.push(...results);
			}

			return embeddings;
		} catch (error) {
			logger.error('[VectorEmbeddingService] Error generating embeddings:', error instanceof Error ? error : new Error(String(error)));
			throw new Error(`Error generating embeddings: ${error}`);
		}
	}

	/**
	 * Process a directory and generate vector embeddings for text files
	 */
	public async processDirectory(
		directory: string,
		isGMContent: boolean = false,
		chunkSize: number = 512
	): Promise<TextWithMetadata[]> {
		try {
			const contentWithMetadata: TextWithMetadata[] = [];

			// Get all files recursively
			const files = await this.getFilesRecursively(directory);

			// Process each file
			for (const file of files) {
				// Only process text and markdown files
				if (!['.txt', '.md'].includes(path.extname(file).toLowerCase())) {
					continue;
				}

				try {
					const content = await fs.readFile(file, 'utf-8');
					const relativeFilePath = path.relative(directory, file);

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
									is_gm_content: isGMContent,
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
								is_gm_content: isGMContent,
								chunk_size: chunkSize
							}
						});
					}
				} catch (error) {
					logger.error(`[VectorEmbeddingService] Error processing file ${file}:`, error instanceof Error ? error : new Error(String(error)));
				}
			}

			return contentWithMetadata;
		} catch (error) {
			logger.error('[VectorEmbeddingService] Error processing directory:', error instanceof Error ? error : new Error(String(error)));
			throw new Error(`Error processing directory: ${error}`);
		}
	}

	/**
	 * Get all files recursively in a directory
	 */
	private async getFilesRecursively(dir: string): Promise<string[]> {
		const dirents = await fs.readdir(dir, { withFileTypes: true });
		const files = await Promise.all(
			dirents.map((dirent) => {
				const res = path.resolve(dir, dirent.name);
				return dirent.isDirectory() ? this.getFilesRecursively(res) : res;
			})
		);
		return files.flat();
	}

	/**
	 * Calculate similarity between two vectors using cosine similarity
	 */
	public calculateCosineSimilarity(vec1: Float32Array, vec2: Float32Array): number {
		if (vec1.length !== vec2.length) {
			throw new Error('Vector dimensions do not match');
		}

		let dotProduct = 0;
		let mag1 = 0;
		let mag2 = 0;

		for (let i = 0; i < vec1.length; i++) {
			dotProduct += vec1[i] * vec2[i];
			mag1 += vec1[i] * vec1[i];
			mag2 += vec2[i] * vec2[i];
		}

		mag1 = Math.sqrt(mag1);
		mag2 = Math.sqrt(mag2);

		if (mag1 === 0 || mag2 === 0) {
			return 0;
		}

		return dotProduct / (mag1 * mag2);
	}

	/**
	 * Save vectors to a file
	 */
	public async saveVectors(
		vectors: Float32Array[],
		metadata: VectorMetadata[],
		texts: string[],
		outputDir: string
	): Promise<void> {
		try {
			// Create output directory if it doesn't exist
			await fs.mkdir(outputDir, { recursive: true });

			// Convert vectors to a format that can be saved
			const vectorsArray = vectors.map(v => Array.from(v));

			// Save vectors
			await fs.writeFile(
				path.join(outputDir, 'vectors.json'),
				JSON.stringify(vectorsArray),
				'utf-8'
			);

			// Save metadata
			await fs.writeFile(
				path.join(outputDir, 'metadata.json'),
				JSON.stringify(metadata),
				'utf-8'
			);

			// Save texts
			await fs.writeFile(
				path.join(outputDir, 'texts.json'),
				JSON.stringify(texts),
				'utf-8'
			);

			logger.info('[VectorEmbeddingService] Saved vectors, metadata, and texts to:', { outputDir });
		} catch (error) {
			logger.error('[VectorEmbeddingService] Error saving vectors:', error instanceof Error ? error : new Error(String(error)));
			throw new Error(`Error saving vectors: ${error}`);
		}
	}

	/**
	 * Load vectors from a directory
	 */
	public async loadVectors(directory: string): Promise<LoadedVectors> {
		try {
			// Read vectors
			const vectorsJson = await fs.readFile(
				path.join(directory, 'vectors.json'),
				'utf-8'
			);
			const vectorsArray = JSON.parse(vectorsJson) as number[][];
			const vectors = vectorsArray.map(arr => new Float32Array(arr));

			// Read metadata
			const metadataJson = await fs.readFile(
				path.join(directory, 'metadata.json'),
				'utf-8'
			);
			const metadata = JSON.parse(metadataJson) as VectorMetadata[];

			// Read texts
			const textsJson = await fs.readFile(
				path.join(directory, 'texts.json'),
				'utf-8'
			);
			const texts = JSON.parse(textsJson) as string[];

			return { vectors, metadata, texts };
		} catch (error) {
			logger.error('[VectorEmbeddingService] Error loading vectors:', error instanceof Error ? error : new Error(String(error)));
			throw new Error(`Error loading vectors: ${error}`);
		}
	}
}
