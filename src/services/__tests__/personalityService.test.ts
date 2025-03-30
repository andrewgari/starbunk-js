import * as fs from 'fs/promises';
import * as path from 'path';
import { VectorEmbeddingService } from '../../starbunk/services/vectorEmbeddingService';
import { logger } from '../logger';
import { PersonalityService } from '../personalityService';

// Mock dependencies
jest.mock('fs/promises');
jest.mock('path');
jest.mock('../logger');

// Mock VectorEmbeddingService
jest.mock('../../starbunk/services/vectorEmbeddingService', () => {
	return {
		VectorEmbeddingService: {
			getInstance: jest.fn().mockReturnValue({
				initialize: jest.fn(),
				generateEmbeddings: jest.fn()
			})
		}
	};
});

// Mock @xenova/transformers
jest.mock('@xenova/transformers', () => ({
	pipeline: jest.fn()
}));

describe('PersonalityService', () => {
	let service: PersonalityService;
	const mockFs = fs as jest.Mocked<typeof fs>;
	const mockPath = path as jest.Mocked<typeof path>;
	const mockLogger = logger as jest.Mocked<typeof logger>;
	const mockVectorService = {
		initialize: jest.fn(),
		generateEmbeddings: jest.fn()
	};

	beforeEach(() => {
		jest.clearAllMocks();

		// Reset singleton
		(PersonalityService as any).instance = null;

		// Mock path.join to return predictable paths
		mockPath.join.mockImplementation((...args) => args.join('/'));

		// Mock VectorEmbeddingService
		(VectorEmbeddingService.getInstance as jest.Mock).mockReturnValue(mockVectorService);

		// Get a fresh instance
		service = PersonalityService.getInstance();
	});

	describe('loadPersonalityEmbedding', () => {
		it('should load JSON embedding successfully', async () => {
			// Mock JSON file content
			const mockEmbedding = [1, 2, 3, 4, 5];
			mockFs.readFile.mockResolvedValueOnce(JSON.stringify(mockEmbedding));

			const result = await service.loadPersonalityEmbedding('personality.json');

			expect(result).toBeInstanceOf(Float32Array);
			expect(Array.from(result!)).toEqual(mockEmbedding);
			expect(mockLogger.info).toHaveBeenCalledWith(
				expect.stringContaining('Successfully loaded personality embedding')
			);
		});

		it('should try JSON first when no extension specified', async () => {
			const mockEmbedding = [1, 2, 3, 4, 5];
			mockFs.readFile.mockResolvedValueOnce(JSON.stringify(mockEmbedding));

			await service.loadPersonalityEmbedding('personality');

			expect(mockFs.readFile).toHaveBeenCalledWith(
				expect.stringContaining('personality.json'),
				'utf-8'
			);
		});

		it('should handle missing JSON file gracefully', async () => {
			mockFs.readFile.mockRejectedValueOnce(new Error('File not found'));

			const result = await service.loadPersonalityEmbedding('personality.json');

			expect(result).toBeNull();
			expect(mockLogger.error).toHaveBeenCalledWith(
				expect.stringContaining('Failed to load JSON personality embedding')
			);
		});

		it('should try NPY format if specified', async () => {
			// Mock NPY file content (128 byte header + data)
			const header = Buffer.alloc(128);
			const data = Buffer.from(new Float32Array([1, 2, 3, 4, 5]).buffer);
			mockFs.readFile.mockResolvedValueOnce(Buffer.concat([header, data]));

			const result = await service.loadPersonalityEmbedding('personality.npy');

			expect(result).toBeInstanceOf(Float32Array);
			expect(Array.from(result!)).toEqual([1, 2, 3, 4, 5]);
		});

		it('should log NPY warning only once', async () => {
			mockFs.readFile.mockRejectedValue(new Error('File not found'));

			await service.loadPersonalityEmbedding('personality.npy');
			await service.loadPersonalityEmbedding('personality.npy');

			expect(mockLogger.debug).toHaveBeenCalledTimes(1);
			expect(mockLogger.debug).toHaveBeenCalledWith(
				expect.stringContaining('NPY format not available')
			);
		});
	});

	describe('generatePersonalityEmbedding', () => {
		it('should generate and save embedding successfully', async () => {
			const mockEmbedding = new Float32Array([1, 2, 3, 4, 5]);
			mockVectorService.generateEmbeddings.mockResolvedValueOnce([mockEmbedding]);

			const result = await service.generatePersonalityEmbedding('test description', true);

			expect(result).toEqual(mockEmbedding);
			expect(mockFs.writeFile).toHaveBeenCalledWith(
				expect.stringContaining('personality.json'),
				JSON.stringify(Array.from(mockEmbedding)),
				'utf-8'
			);
		});

		it('should handle generation errors gracefully', async () => {
			mockVectorService.generateEmbeddings.mockResolvedValueOnce([]);

			const result = await service.generatePersonalityEmbedding('test description');

			expect(result).toBeNull();
			expect(mockLogger.error).toHaveBeenCalledWith(
				expect.stringContaining('Error generating personality embedding'),
				expect.any(Error)
			);
		});
	});

	describe('singleton behavior', () => {
		it('should return the same instance', () => {
			const instance1 = PersonalityService.getInstance();
			const instance2 = PersonalityService.getInstance();
			expect(instance1).toBe(instance2);
		});
	});
});
