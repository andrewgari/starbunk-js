import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';

export class PersonalityService {
	private static instance: PersonalityService | null = null;
	private personalityEmbedding: Float32Array | null = null;

	private constructor() { }

	public static getInstance(): PersonalityService {
		if (!PersonalityService.instance) {
			PersonalityService.instance = new PersonalityService();
		}
		return PersonalityService.instance;
	}

	public async loadPersonalityEmbedding(filename: string = 'personality.npy'): Promise<Float32Array | null> {
		try {
			// Get the path to the data/llm_context/covaBot directory where the .npy file is stored
			const dataDir = path.join(process.cwd(), 'data', 'llm_context', 'covaBot');
			const filePath = path.join(dataDir, filename);

			// Check if file exists
			if (!fs.existsSync(filePath)) {
				logger.error(`[PersonalityService] Personality embedding file not found: ${filePath}`);
				return null;
			}

			// Read the .npy file
			const buffer = fs.readFileSync(filePath);

			// Parse the .npy file format
			// Skip the header (first 128 bytes is usually sufficient for simple .npy files)
			const dataBuffer = buffer.slice(128);

			// Convert to Float32Array
			this.personalityEmbedding = new Float32Array(dataBuffer.buffer, dataBuffer.byteOffset, dataBuffer.length / 4);

			logger.info(`[PersonalityService] Successfully loaded personality embedding with ${this.personalityEmbedding.length} dimensions`);
			return this.personalityEmbedding;
		} catch (error) {
			logger.error(`[PersonalityService] Error loading personality embedding: ${error instanceof Error ? error.message : String(error)}`);
			return null;
		}
	}

	public getPersonalityEmbedding(): Float32Array | null {
		return this.personalityEmbedding;
	}
}

export const getPersonalityService = (): PersonalityService => {
	return PersonalityService.getInstance();
};
