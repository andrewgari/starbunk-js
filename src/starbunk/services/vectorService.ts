import { ChildProcess, spawn } from 'child_process';
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

	static fromProcessError(error: unknown): VectorServiceError {
		if (error instanceof Error) {
			try {
				const parsedError = JSON.parse(error.message);
				return new VectorServiceError('Python process error', {
					error: parsedError.error || error.message,
					status: parsedError.status || 'error',
					code: parsedError.code
				});
			} catch {
				return new VectorServiceError('Python process error', {
					error: error.message,
					status: 'error'
				});
			}
		}
		return new VectorServiceError('Python process error', {
			error: String(error),
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

interface PythonProcessResult {
	error?: string;
	status?: string;
	results?: VectorSearchResult[];
}

export class VectorService {
	private static instance: VectorService | null = null;
	private readonly fileService: CampaignFileService;
	private readonly contextDir: string;

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

	/**
	 * Generate vector embeddings for a directory using TypeScript implementation
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

			const embeddingService = VectorEmbeddingService.getInstance();

			// Initialize with the specified model if provided
			if (options.modelName) {
				await embeddingService.initialize(options.modelName);
			} else {
				await embeddingService.initialize();
			}

			// Process the directory to get content with metadata
			const contentWithMetadata = await embeddingService.processDirectory(
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
			const embeddings = await embeddingService.generateEmbeddings(texts);

			// Ensure output directory exists
			const outputDirPath = options.namespace
				? path.join(options.outputDir, options.namespace)
				: options.outputDir;

			// Save vectors, metadata, and texts
			await embeddingService.saveVectors(embeddings, metadata, texts, outputDirPath);

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
		} catch (error) {
			throw VectorServiceError.fromError('Failed to generate vectors', error);
		}
	}

	/**
	 * Check if a directory exists
	 */
	private async directoryExists(directory: string): Promise<boolean> {
		try {
			const stats = await fs.stat(directory);
			return stats.isDirectory();
		} catch (error) {
			return false;
		}
	}

	private spawnPythonProcess(args: string[]): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			let errorOutput = '';
			const pythonProcess: ChildProcess = spawn('python3', args);

			if (!pythonProcess.stderr || !pythonProcess.stdout) {
				reject(new VectorServiceError('Failed to spawn Python process', {
					error: 'Process streams not available',
					status: 'error'
				}));
				return;
			}

			pythonProcess.stderr.on('data', (data: Buffer) => {
				errorOutput += data.toString();
			});

			pythonProcess.on('close', (code: number | null) => {
				if (code !== 0) {
					try {
						const parsedError = JSON.parse(errorOutput);
						reject(VectorServiceError.fromProcessError(new Error(parsedError.error || errorOutput)));
					} catch {
						reject(VectorServiceError.fromProcessError(new Error(errorOutput || 'Unknown Python process error')));
					}
				} else {
					resolve();
				}
			});

			pythonProcess.on('error', (error: Error) => {
				reject(VectorServiceError.fromProcessError(error));
			});
		});
	}

	public async generateVectorsFromTexts(
		namespace: string,
		texts: readonly TextWithMetadata[]
	): Promise<void> {
		const tempDir = path.join(process.cwd(), 'data', 'temp');
		const tempFile = path.join(tempDir, `${namespace}_texts.json`);
		const contextDir = path.join(process.cwd(), 'data', 'vectors', namespace);

		try {
			await fs.mkdir(tempDir, { recursive: true });
			await fs.writeFile(tempFile, JSON.stringify(texts), 'utf-8');

			const args: string[] = [
				path.join(process.cwd(), 'scripts', 'generate_vectors.py'),
				'--text-file', tempFile,
				'--context-dir', contextDir,
				'--namespace', namespace
			];

			await this.spawnPythonProcess(args);
		} catch (error) {
			throw VectorServiceError.fromError('Failed to generate vectors from texts', error);
		} finally {
			try {
				await fs.unlink(tempFile);
			} catch (error) {
				logger.warn('[VectorService] Failed to clean up temporary file:', { error });
			}
		}
	}

	public async findSimilarTexts(
		namespace: string,
		query: string,
		limit = 5
	): Promise<VectorSearchResult[]> {
		const contextDir = path.join(process.cwd(), 'data', 'vectors', namespace);

		return new Promise<VectorSearchResult[]>((resolve, reject) => {
			const args = [
				path.join(process.cwd(), 'scripts', 'search_vectors.py'),
				'--context-dir', contextDir,
				'--query', query,
				'--limit', limit.toString()
			] as const;

			const pythonProcess: ChildProcess = spawn('python3', args);
			let stdout = '';
			let stderr = '';

			if (!pythonProcess.stdout || !pythonProcess.stderr) {
				reject(new VectorServiceError('Failed to spawn Python process', {
					error: 'Process streams not available',
					status: 'error'
				}));
				return;
			}

			pythonProcess.stdout.on('data', (data: Buffer) => {
				stdout += data.toString();
			});

			pythonProcess.stderr.on('data', (data: Buffer) => {
				stderr += data.toString();
			});

			pythonProcess.on('close', (code: number | null) => {
				if (code === 0) {
					try {
						const result = JSON.parse(stdout) as PythonProcessResult;
						if (result.error) {
							reject(VectorServiceError.fromProcessError(new Error(result.error)));
						} else if (result.results) {
							resolve(result.results);
						} else {
							reject(VectorServiceError.fromProcessError(new Error('Invalid response format')));
						}
					} catch (error) {
						reject(VectorServiceError.fromProcessError(new Error(stderr || 'Failed to parse Python output')));
					}
				} else {
					reject(VectorServiceError.fromProcessError(new Error(stderr || 'Python process failed')));
				}
			});

			pythonProcess.on('error', (error: Error) => {
				reject(VectorServiceError.fromProcessError(error));
			});
		});
	}

	public async vectorizeCampaignContent(
		campaignId: string,
		options: VectorGenerationOptions = { includeGMContent: false }
	): Promise<void> {
		logger.info('[VectorService] Starting campaign content vectorization', {
			campaignId,
			includeGMContent: options.includeGMContent
		});

		try {
			const playerNamespace = `campaign_${campaignId}_player` as const;
			const gmNamespace = `campaign_${campaignId}_gm` as const;

			await this.generateVectors(campaignId, {
				...options,
				includeGMContent: false,
				namespace: playerNamespace
			});

			if (options.includeGMContent) {
				await this.generateVectors(campaignId, {
					...options,
					includeGMContent: true,
					namespace: gmNamespace
				});
			}

			logger.info('[VectorService] Campaign content vectorization completed', { campaignId });
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
			const results: VectorSearchResult[] = [];

			const playerResults = await this.findSimilarTexts(
				`campaign_${campaignId}_player`,
				query,
				limit
			);
			results.push(...playerResults);

			if (hasGMAccess) {
				const gmResults = await this.findSimilarTexts(
					`campaign_${campaignId}_gm`,
					query,
					limit
				);
				results.push(...gmResults);
			}

			return Object.freeze(
				results
					.sort((a, b) => b.similarity - a.similarity)
					.slice(0, limit)
			);
		} catch (error) {
			throw VectorServiceError.fromError('Failed to search campaign content', error);
		}
	}
}
