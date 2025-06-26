import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from './logger';

// Dynamic import for VectorEmbeddingService to handle missing dependency
let VectorEmbeddingService: any = null;
try {
	// Try to import VectorEmbeddingService if available
	const vectorModule = require('../starbunk/services/vectorEmbeddingService');
	VectorEmbeddingService = vectorModule.VectorEmbeddingService;
} catch (_error) {
	// VectorEmbeddingService not available - will handle gracefully
	logger.debug('[PersonalityService] VectorEmbeddingService not available, embedding generation disabled');
}

// Custom error for personality embedding errors
export class PersonalityEmbeddingError extends Error {
	filePath: string;

	constructor(message: string, filePath: string) {
		super(message);
		this.name = 'PersonalityEmbeddingError';
		this.filePath = filePath;
	}
}

export class PersonalityService {
	private static instance: PersonalityService | null = null;
	private personalityEmbedding: Float32Array | null = null;
	private embeddingService: any = null;
	private hasLoggedNpyWarning = false;

	private constructor() {
		if (VectorEmbeddingService) {
			this.embeddingService = VectorEmbeddingService.getInstance();
		} else {
			logger.debug('[PersonalityService] VectorEmbeddingService not available, embedding generation will be disabled');
		}
	}

	public static getInstance(): PersonalityService {
		if (!PersonalityService.instance) {
			PersonalityService.instance = new PersonalityService();
		}
		return PersonalityService.instance;
	}

	/**
	 * Load a personality embedding from disk
	 *
	 * @param filename The embedding file to load (supports .json or .npy)
	 * @param botName The bot name to load the embedding for (default: 'covaBot')
	 * @returns The loaded embedding as a Float32Array
	 */
	public async loadPersonalityEmbedding(
		filename: string = 'personality.json',
		botName: string = 'covaBot'
	): Promise<Float32Array | null> {
		try {
			// Get the path to the data/llm_context/{botName} directory where the embedding file is stored
			const dataDir = path.join(process.cwd(), 'data', 'llm_context', botName);

			// Check if directory exists
			try {
				await fs.access(dataDir);
			} catch (_error) {
				logger.warn(`[PersonalityService] Context directory not found at ${dataDir}. Creating it...`);
				await fs.mkdir(dataDir, { recursive: true });
			}

			// Try loading JSON first if filename is not explicitly .npy
			if (!filename.endsWith('.npy')) {
				const jsonPath = path.join(dataDir, filename.endsWith('.json') ? filename : 'personality.json');
				try {
					const fileContent = await fs.readFile(jsonPath, 'utf-8');
					const data = JSON.parse(fileContent);

					if (Array.isArray(data)) {
						this.personalityEmbedding = new Float32Array(data);
						// Validate the embedding size - MiniLM-L6-v2 has 384 dimensions
						if (this.personalityEmbedding.length < 10) {
							logger.warn(`[PersonalityService] Loaded embedding has suspiciously few dimensions (${this.personalityEmbedding.length}). Expected ~384 for MiniLM-L6-v2.`);
						}
						logger.info(`[PersonalityService] Successfully loaded personality embedding from ${jsonPath} with ${this.personalityEmbedding.length} dimensions`);
						return this.personalityEmbedding;
					}
				} catch (jsonError) {
					// Only log if we're explicitly trying to load a JSON file
					if (filename.endsWith('.json')) {
						logger.error(`[PersonalityService] Failed to load JSON personality embedding: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`);
					}
				}
			}

			// Try NPY format if JSON failed or NPY was explicitly requested
			if (filename.endsWith('.npy')) {
				const npyPath = path.join(dataDir, filename);
				try {
					const buffer = await fs.readFile(npyPath);
					const dataBuffer = buffer.slice(128);
					this.personalityEmbedding = new Float32Array(dataBuffer.buffer, dataBuffer.byteOffset, dataBuffer.length / 4);

					if (this.personalityEmbedding.length < 10) {
						throw new Error(`Invalid NPY file: embedding length (${this.personalityEmbedding.length}) too small`);
					}

					logger.info(`[PersonalityService] Successfully loaded personality embedding from ${npyPath} with ${this.personalityEmbedding.length} dimensions`);
					return this.personalityEmbedding;
				} catch (_npyError) {
					// Only log NPY warning once per service instance
					if (!this.hasLoggedNpyWarning) {
						logger.debug(`[PersonalityService] NPY format not available, using JSON format instead`);
						logger.info(`[${botName}] NPY personality embedding not found, trying JSON format...`);
						this.hasLoggedNpyWarning = true;
					}
				}
			}

			// If we get here and haven't returned, no valid embedding was loaded
			if (!this.personalityEmbedding) {
				logger.error(`[PersonalityService] Failed to load personality embedding from any format`);
			}

			return this.personalityEmbedding;
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			logger.error(`[PersonalityService] Unexpected error loading personality embedding: ${err.message}`, err);
			return null;
		}
	}

	/**
	 * Generate a new personality embedding from a text description
	 *
	 * @param description The text description to generate an embedding from
	 * @param saveToFile Whether to save the embedding to disk (optional filename)
	 * @param botName Optional bot name (defaults to 'covaBot')
	 * @returns The generated embedding as a Float32Array
	 */
	public async generatePersonalityEmbedding(
		description: string,
		saveToFile: string | boolean = false,
		botName: string = 'covaBot'
	): Promise<Float32Array | null> {
		try {
			// Check if embedding service is available
			if (!this.embeddingService) {
				logger.warn('[PersonalityService] VectorEmbeddingService not available, cannot generate embeddings');
				return null;
			}

			// Initialize the embedding service if needed
			await this.embeddingService.initialize();

			// Generate the embedding
			const embeddings = await this.embeddingService.generateEmbeddings([description]);
			if (embeddings.length === 0) {
				throw new Error('Failed to generate embedding');
			}

			this.personalityEmbedding = embeddings[0];

			// Save to file if requested
			if (saveToFile) {
				const dataDir = path.join(process.cwd(), 'data', 'llm_context', botName);

				// Create directory if it doesn't exist
				await fs.mkdir(dataDir, { recursive: true });

				// Determine filename
				const filename = typeof saveToFile === 'string'
					? saveToFile
					: 'personality.json';

				const filePath = path.join(dataDir, filename);

				// Save as JSON
				if (filename.endsWith('.json')) {
					await fs.writeFile(
						filePath,
						JSON.stringify(Array.from(this.personalityEmbedding || [])),
						'utf-8'
					);
				} else {
					throw new Error(`Unsupported file format for saving: ${filename}`);
				}

				logger.info(`[PersonalityService] Saved personality embedding to ${filePath}`);
			}

			return this.personalityEmbedding;
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			logger.error(`[PersonalityService] Error generating personality embedding: ${err.message}`, err);
			return null;
		}
	}

	/**
	 * Get the current personality embedding
	 */
	public getPersonalityEmbedding(): Float32Array | null {
		return this.personalityEmbedding;
	}
}

export const getPersonalityService = (): PersonalityService => {
	return PersonalityService.getInstance();
};
