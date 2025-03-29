import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from './logger';
import { VectorEmbeddingService } from '../starbunk/services/vectorEmbeddingService';

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
	private embeddingService: VectorEmbeddingService;

	private constructor() {
		this.embeddingService = VectorEmbeddingService.getInstance();
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
	 * @returns The loaded embedding as a Float32Array
	 */
	public async loadPersonalityEmbedding(filename: string = 'personality.json'): Promise<Float32Array | null> {
		try {
			// Get the path to the data/llm_context/covaBot directory where the embedding file is stored
			const dataDir = path.join(process.cwd(), 'data', 'llm_context', 'covaBot');
			const filePath = path.join(dataDir, filename);

			// Check if file exists
			try {
				await fs.access(filePath);
			} catch (error) {
				const fileError = new PersonalityEmbeddingError(
					`Personality embedding file not found: ${filePath}`,
					filePath
				);
				logger.warn(`[PersonalityService] ${fileError.message}`);
				return null;
			}

			// Handle different file formats
			if (filename.endsWith('.json')) {
				// Read the .json file
				const fileContent = await fs.readFile(filePath, 'utf-8');
				
				try {
					const data = JSON.parse(fileContent);
					
					// Convert to Float32Array
					if (Array.isArray(data)) {
						this.personalityEmbedding = new Float32Array(data);
					} else {
						const formatError = new PersonalityEmbeddingError(
							`Invalid JSON format for personality embedding: ${filePath}`,
							filePath
						);
						logger.error(`[PersonalityService] ${formatError.message}`);
						return null;
					}
				} catch (parseError) {
					const jsonError = new PersonalityEmbeddingError(
						`Failed to parse JSON personality embedding: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
						filePath
					);
					logger.error(`[PersonalityService] ${jsonError.message}`);
					return null;
				}
			} else if (filename.endsWith('.npy')) {
				try {
					// Read the .npy file
					const buffer = await fs.readFile(filePath);

					// Parse the .npy file format (simplified approach)
					// Skip the header (first 128 bytes is usually sufficient for simple .npy files)
					const dataBuffer = buffer.slice(128);

					// Convert to Float32Array
					this.personalityEmbedding = new Float32Array(dataBuffer.buffer, dataBuffer.byteOffset, dataBuffer.length / 4);
					
					// Basic verification - check if the array has a reasonable length
					if (this.personalityEmbedding.length < 10) {
						throw new Error(`Invalid NPY file: embedding length (${this.personalityEmbedding.length}) too small`);
					}
				} catch (npyError) {
					const formatError = new PersonalityEmbeddingError(
						`Failed to load NPY personality embedding: ${npyError instanceof Error ? npyError.message : String(npyError)}`,
						filePath
					);
					logger.error(`[PersonalityService] ${formatError.message}`);
					return null;
				}
			} else {
				const extensionError = new PersonalityEmbeddingError(
					`Unsupported file format: ${filename}`,
					filePath
				);
				logger.error(`[PersonalityService] ${extensionError.message}`);
				return null;
			}

			logger.info(`[PersonalityService] Successfully loaded personality embedding from ${filePath} with ${this.personalityEmbedding.length} dimensions`);
			return this.personalityEmbedding;
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			const dataDir = path.join(process.cwd(), 'data', 'llm_context', 'covaBot');
			const filePath = path.join(dataDir, filename);
			const customError = new PersonalityEmbeddingError(`Error loading personality embedding: ${err.message}`, filePath);
			logger.error(`[PersonalityService] ${customError.message}`, customError);
			return null;
		}
	}

	/**
	 * Generate a new personality embedding from a text description
	 * 
	 * @param description The text description to generate an embedding from
	 * @param saveToFile Whether to save the embedding to disk (optional filename)
	 * @returns The generated embedding as a Float32Array
	 */
	public async generatePersonalityEmbedding(
		description: string, 
		saveToFile: string | boolean = false
	): Promise<Float32Array | null> {
		try {
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
				const dataDir = path.join(process.cwd(), 'data', 'llm_context', 'covaBot');
				
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
						JSON.stringify(Array.from(this.personalityEmbedding)),
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