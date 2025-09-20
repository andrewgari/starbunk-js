import { pipeline } from '@xenova/transformers';
import { execFile } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import mammoth from 'mammoth';
import { logger } from '@starbunk/shared';
import { TextWithMetadata } from '../types/textWithMetadata';
import { VectorMetadata } from './vectorService';

export interface LoadedVectors {
	vectors: Float32Array[];
	metadata: any[];
	texts: string[];
}

// Custom error classes with additional properties
export class PythonScriptError extends Error {
	scriptPath: string;
	timeout?: number;
	stderr?: string;

	constructor(message: string, scriptPath: string, options?: { timeout?: number; stderr?: string }) {
		super(message);
		this.name = 'PythonScriptError';
		this.scriptPath = scriptPath;
		if (options?.timeout) this.timeout = options.timeout;
		if (options?.stderr) this.stderr = options.stderr;
	}
}

export class VectorFileError extends Error {
	directoryPath: string;
	fileDetails: Record<string, boolean>;

	constructor(message: string, directoryPath: string, fileDetails: Record<string, boolean>) {
		super(message);
		this.name = 'VectorFileError';
		this.directoryPath = directoryPath;
		this.fileDetails = fileDetails;
	}
}

// Type for Python script execution result
interface PythonScriptResult {
	stdout: string;
	stderr: string;
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
		logger.info('[VectorEmbeddingService] 🧠 Service instantiated with default model', {
			model: this.modelName,
		});
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
		if (this.initialized) {
			logger.debug('[VectorEmbeddingService] 🔄 Embedding service already initialized', {
				model: this.modelName,
			});
			return;
		}

		if (this.initPromise) {
			logger.debug('[VectorEmbeddingService] 🔄 Initialization already in progress, waiting...');
			return this.initPromise;
		}

		this.initPromise = (async () => {
			try {
				if (modelName) {
					logger.info('[VectorEmbeddingService] 🔄 Changing model to', { model: modelName });
					this.modelName = modelName;
				}

				logger.info('[VectorEmbeddingService] 🚀 Initializing embedding pipeline with model:', {
					model: this.modelName,
				});
				this.embeddingPipeline = await pipeline('feature-extraction', this.modelName);
				this.initialized = true;
				logger.info('[VectorEmbeddingService] ✅ Embedding pipeline initialized successfully');
			} catch (error) {
				logger.error(
					'[VectorEmbeddingService] ❌ Failed to initialize embedding pipeline:',
					error instanceof Error ? error : new Error(String(error)),
				);
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
			logger.info('[VectorEmbeddingService] 🔄 Embedding service not initialized, initializing now...');
			await this.initialize();
		}

		try {
			const embeddings: Float32Array[] = [];
			logger.debug(`[VectorEmbeddingService] 🔍 Generating embeddings for ${texts.length} texts`);

			// Log some sample text snippets for verification
			if (texts.length > 0) {
				logger.info('[VectorEmbeddingService] 📝 Sample input texts:', {
					totalTexts: texts.length,
					samples: texts.slice(0, 3).map((text) => ({
						length: text.length,
						preview: text.length > 100 ? `${text.substring(0, 100)}...` : text,
						tokenEstimate: Math.round(text.length / 4), // Rough estimate of token count
					})),
				});
			}

			// Process in batches to avoid memory issues
			const batchSize = 32;
			const totalBatches = Math.ceil(texts.length / batchSize);

			logger.debug(`[VectorEmbeddingService] 📊 Processing in ${totalBatches} batches of ${batchSize}`);

			for (let i = 0; i < texts.length; i += batchSize) {
				const batch = texts.slice(i, i + batchSize);
				const batchNumber = Math.floor(i / batchSize) + 1;
				logger.debug(
					`[VectorEmbeddingService] 🔄 Processing batch ${batchNumber}/${totalBatches} (${batch.length} texts)`,
				);

				// Log first text in each batch for verification
				if (batch.length > 0) {
					const sampleText = batch[0];
					logger.debug(`[VectorEmbeddingService] 📝 Batch ${batchNumber} first text:`, {
						length: sampleText.length,
						preview: sampleText.length > 200 ? `${sampleText.substring(0, 200)}...` : sampleText,
						tokenEstimate: Math.round(sampleText.length / 4), // Rough estimate of token count
					});
				}

				const results = await Promise.all(
					batch.map(async (text, idx) => {
						// Log start of individual text tokenization
						const startTime = Date.now();
						logger.debug(
							`[VectorEmbeddingService] 🔄 Tokenizing text ${idx + 1}/${batch.length} in batch ${batchNumber} (length: ${text.length})`,
						);

						const output = await this.embeddingPipeline(text, {
							pooling: 'mean',
							normalize: true,
						});

						const processingTime = Date.now() - startTime;
						// Log detailed embedding information for the first few texts
						if (idx === 0 || idx === batch.length - 1) {
							logger.debug(`[VectorEmbeddingService] ✅ Text ${idx + 1} embedding complete`, {
								processingTimeMs: processingTime,
								dimensions: output.data.length,
								embeddingSample: Array.from(output.data)
									.slice(0, 5)
									.map((v) => (v as number).toFixed(4)), // Show first 5 values
							});
						}

						return output.data;
					}),
				);

				embeddings.push(...results);
				logger.info(`[VectorEmbeddingService] ✅ Batch ${batchNumber}/${totalBatches} complete`, {
					dimensions: results[0]?.length || 0,
					processedTexts: batch.length,
					samplesGenerated: embeddings.length,
				});
			}

			// Show stats on the entire embedding set
			const embeddingSizeBytes = embeddings.length * (embeddings[0]?.length || 0) * 4; // 4 bytes per float32
			logger.info(`[VectorEmbeddingService] ✅ Generated ${embeddings.length} embeddings successfully`, {
				dimensions: embeddings[0]?.length || 0,
				totalSizeBytes: embeddingSizeBytes,
				totalSizeMB: (embeddingSizeBytes / (1024 * 1024)).toFixed(2) + 'MB',
				bytesPerEmbedding: embeddings[0] ? embeddings[0].length * 4 : 0,
			});

			return embeddings;
		} catch (error) {
			logger.error(
				'[VectorEmbeddingService] ❌ Error generating embeddings:',
				error instanceof Error ? error : new Error(String(error)),
			);
			throw new Error(`Error generating embeddings: ${error}`);
		}
	}

	/**
	 * Process a directory and generate vector embeddings for text files
	 */
	public async processDirectory(
		directory: string,
		isGMContent: boolean = false,
		chunkSize: number = 512,
	): Promise<TextWithMetadata[]> {
		try {
			logger.info(`[VectorEmbeddingService] 📂 Processing directory ${directory}`, {
				directory,
				isGMContent,
				chunkSize,
			});

			const contentWithMetadata: TextWithMetadata[] = [];

			// Get all files recursively
			logger.debug('[VectorEmbeddingService] 🔍 Finding all files recursively...');
			const files = await this.getFilesRecursively(directory);
			logger.info(`[VectorEmbeddingService] 📊 Found ${files.length} files`, {
				directory,
				fileExtensions: Array.from(new Set(files.map((f) => path.extname(f)))).join(', '),
			});

			// Process each file
			const supportedExtensions = ['.txt', '.md', '.json', '.docx'];
			const textFiles = files.filter((file) => supportedExtensions.includes(path.extname(file).toLowerCase()));

			logger.info(
				`[VectorEmbeddingService] 📄 Processing ${textFiles.length} text files of ${files.length} total files`,
			);

			let processedCount = 0;
			let errorCount = 0;

			for (const file of textFiles) {
				try {
					const fileExtension = path.extname(file).toLowerCase();
					const relativeFilePath = path.relative(directory, file);

					logger.debug(`[VectorEmbeddingService] 📝 Processing file: ${relativeFilePath}`, {
						extension: fileExtension,
					});

					let content = '';

					// Process based on file type
					if (fileExtension === '.docx') {
						// Extract text from DOCX using mammoth
						logger.debug(`[VectorEmbeddingService] 📄 Extracting text from DOCX file: ${relativeFilePath}`);
						const buffer = await fs.readFile(file);
						const _result = await mammoth.extractRawText({ buffer });
						content = _result.value;
						logger.debug(`[VectorEmbeddingService] ✅ Extracted ${content.length} characters from DOCX`);
					} else {
						// Read regular text files
						content = await fs.readFile(file, 'utf-8');
					}

					logger.debug(`[VectorEmbeddingService] 📄 Read file content`, {
						file: relativeFilePath,
						contentLength: content.length,
						firstChars: content.substring(0, 50) + '...',
					});

					// Split into chunks if needed
					if (content.length > chunkSize) {
						const chunks = [];
						for (let i = 0; i < content.length; i += chunkSize) {
							chunks.push(content.substring(i, i + chunkSize));
						}

						logger.debug(`[VectorEmbeddingService] 🧩 Split into ${chunks.length} chunks`, {
							file: relativeFilePath,
							contentLength: content.length,
							chunkSize,
							chunkCount: chunks.length,
						});

						// Add each chunk with metadata
						for (const [index, chunk] of chunks.entries()) {
							contentWithMetadata.push({
								text: chunk,
								metadata: {
									file: `${relativeFilePath}:chunk${index + 1}`,
									is_gm_content: isGMContent,
									chunk_size: chunkSize,
								},
							});
						}
					} else {
						// Add the entire content with metadata
						contentWithMetadata.push({
							text: content,
							metadata: {
								file: relativeFilePath,
								is_gm_content: isGMContent,
								chunk_size: chunkSize,
							},
						});
					}

					processedCount++;
					logger.debug(`[VectorEmbeddingService] ✅ File processed successfully`, {
						file: relativeFilePath,
					});
				} catch (error) {
					errorCount++;
					logger.error(
						`[VectorEmbeddingService] ❌ Error processing file ${file}:`,
						error instanceof Error ? error : new Error(String(error)),
					);
				}
			}

			logger.info(`[VectorEmbeddingService] 📊 Directory processing complete`, {
				directory,
				totalFiles: files.length,
				textFiles: textFiles.length,
				processedCount,
				errorCount,
				chunksCreated: contentWithMetadata.length,
			});

			return contentWithMetadata;
		} catch (error) {
			logger.error(
				'[VectorEmbeddingService] ❌ Error processing directory:',
				error instanceof Error ? error : new Error(String(error)),
			);
			throw new Error(`Error processing directory: ${error}`);
		}
	}

	/**
	 * Get all files recursively in a directory
	 */
	private async getFilesRecursively(dir: string): Promise<string[]> {
		try {
			const dirents = await fs.readdir(dir, { withFileTypes: true });
			const files = await Promise.all(
				dirents.map((dirent) => {
					const res = path.resolve(dir, dirent.name);
					return dirent.isDirectory() ? this.getFilesRecursively(res) : res;
				}),
			);
			return files.flat();
		} catch (error) {
			logger.error(
				`[VectorEmbeddingService] ❌ Error reading directory ${dir}:`,
				error instanceof Error ? error : new Error(String(error)),
			);
			return [];
		}
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
	public async saveVectors(vectors: number[][], metadata: any[], texts: string[], outputDir: string): Promise<void> {
		const tempVectorsPath = path.join(outputDir, 'temp_vectors.json');
		const outputPath = path.join(outputDir, 'vectors.npy');
		const metadataPath = path.join(outputDir, 'metadata.json');
		const textsPath = path.join(outputDir, 'texts.json');

		logger.info('[VectorEmbeddingService] 💾 Saving vectors and metadata...', {
			outputDir,
			vectorCount: vectors.length,
			vectorDimensions: vectors[0]?.length || 0,
		});

		try {
			// Create output directory if it doesn't exist
			await fs.mkdir(outputDir, { recursive: true });
			logger.debug('[VectorEmbeddingService] 📁 Output directory created/verified', { outputDir });

			// Log vector data information
			const vectorSizeBytes = vectors.length * (vectors[0]?.length || 0) * 8; // 8 bytes per double in JSON
			logger.debug('[VectorEmbeddingService] 📊 Vector data information', {
				vectorCount: vectors.length,
				dimensions: vectors[0]?.length || 0,
				estimatedSizeBytes: vectorSizeBytes,
				estimatedSizeMB: (vectorSizeBytes / (1024 * 1024)).toFixed(2) + 'MB',
				firstVectorSample: vectors[0]?.slice(0, 5).map((v) => (v as number).toFixed(4)),
			});

			// Log texts information
			logger.debug('[VectorEmbeddingService] 📝 Text data information', {
				textCount: texts.length,
				averageLength:
					texts.length > 0 ? Math.round(texts.reduce((sum, text) => sum + text.length, 0) / texts.length) : 0,
				totalCharacters: texts.reduce((sum, text) => sum + text.length, 0),
				firstTextSample:
					texts[0]?.length > 100 ? `${texts[0].substring(0, 100)}...` : texts[0] || 'No text data',
			});

			// Save vectors to temporary JSON file
			const startTimeJson = Date.now();
			logger.debug('[VectorEmbeddingService] 💾 Writing vectors to temporary JSON file...');
			await fs.writeFile(tempVectorsPath, JSON.stringify(vectors));
			const jsonWriteTime = Date.now() - startTimeJson;

			// Get file size
			const tempFileStats = await fs.stat(tempVectorsPath);
			logger.debug('[VectorEmbeddingService] ✅ Temporary JSON file created', {
				tempVectorsPath,
				sizeBytes: tempFileStats.size,
				sizeMB: (tempFileStats.size / (1024 * 1024)).toFixed(2) + 'MB',
				writeTimeMs: jsonWriteTime,
			});

			// Execute Python script
			const scriptPath = path.join(process.cwd(), 'scripts', 'save_vectors.py');
			logger.info('[VectorEmbeddingService] 🐍 Executing Python script', {
				scriptPath,
				tempVectorsPath,
				outputPath,
				vectorCount: vectors.length,
				dimensions: vectors[0]?.length || 0,
			});

			const pythonStartTime = Date.now();
			const { stdout, stderr } = await this.runPythonScript(
				scriptPath,
				['--vectors', tempVectorsPath, '--output', outputPath],
				30000,
			);
			const pythonExecutionTime = Date.now() - pythonStartTime;

			logger.debug('[VectorEmbeddingService] 📝 Python script execution', {
				executionTimeMs: pythonExecutionTime,
				stdoutLength: stdout.length,
				stderrLength: stderr.length,
				stdout: stdout.substring(0, 1000) + (stdout.length > 1000 ? '...(truncated)' : ''),
				stderr: stderr ? stderr.substring(0, 500) : 'No stderr output',
			});

			// Parse stdout as JSON
			try {
				logger.debug('[VectorEmbeddingService] 🔄 Parsing Python script output...');
				const _result = JSON.parse(stdout);
				if (_result.status === 'success') {
					logger.info('[VectorEmbeddingService] ✅ Vectors saved successfully', {
						outputPath: _result.output_path,
						shape: _result.shape,
						dtype: _result.dtype,
						fileSize: _result.file_size_bytes || 'unknown',
						fileSizeMB: _result.file_size_bytes
							? (_result.file_size_bytes / (1024 * 1024)).toFixed(2) + 'MB'
							: 'unknown',
						conversionTimeMs: pythonExecutionTime,
					});
				} else if (_result.status === 'warning') {
					logger.warn('[VectorEmbeddingService] ⚠️ Vectors saved with warnings:', {
						message: _result.message,
						outputPath: _result.output_path,
					});
				} else {
					throw new Error(`Python script returned error status: ${JSON.stringify(_result)}`);
				}
			} catch (e) {
				if (e instanceof SyntaxError) {
					logger.warn('[VectorEmbeddingService] ⚠️ Failed to parse Python script output:', {
						stdout: stdout.substring(0, 300),
						stderr: stderr.substring(0, 300),
						error: e,
					});
					throw new Error('Failed to parse Python script output');
				}
				throw e;
			}

			// Save metadata and texts
			const startTimeMetadata = Date.now();
			logger.debug('[VectorEmbeddingService] 💾 Saving metadata and texts...');
			await fs.writeFile(metadataPath, JSON.stringify(metadata));
			await fs.writeFile(textsPath, JSON.stringify(texts));
			const metadataWriteTime = Date.now() - startTimeMetadata;

			// Get file sizes
			const [metadataStats, textsStats] = await Promise.all([fs.stat(metadataPath), fs.stat(textsPath)]);

			logger.debug('[VectorEmbeddingService] ✅ Metadata and text files saved', {
				metadataPath,
				metadataSizeBytes: metadataStats.size,
				metadataSizeKB: (metadataStats.size / 1024).toFixed(2) + 'KB',
				textsPath,
				textsSizeBytes: textsStats.size,
				textsSizeKB: (textsStats.size / 1024).toFixed(2) + 'KB',
				writeTimeMs: metadataWriteTime,
			});

			// Verify all files exist
			const [vectorsNpyExists, vectorsJsonExists, metadataExists, textsExists] = await Promise.all([
				fs
					.access(outputPath)
					.then(() => true)
					.catch(() => false),
				fs
					.access(outputPath.replace('.npy', '.json'))
					.then(() => true)
					.catch(() => false),
				fs
					.access(metadataPath)
					.then(() => true)
					.catch(() => false),
				fs
					.access(textsPath)
					.then(() => true)
					.catch(() => false),
			]);

			// Get NPY file size if it exists
			let npySizeInfo = {};
			if (vectorsNpyExists) {
				const npyStats = await fs.stat(outputPath);
				npySizeInfo = {
					sizeBytes: npyStats.size,
					sizeMB: (npyStats.size / (1024 * 1024)).toFixed(2) + 'MB',
				};
			}

			logger.info('[VectorEmbeddingService] 📊 File verification results', {
				vectorsNpy: vectorsNpyExists ? '✅' : '❌',
				vectorsJson: vectorsJsonExists ? '✅' : '❌',
				metadata: metadataExists ? '✅' : '❌',
				texts: textsExists ? '✅' : '❌',
				npyInfo: vectorsNpyExists ? npySizeInfo : 'N/A',
			});
		} catch (error) {
			if (error instanceof PythonScriptError) {
				const logInfo = {
					scriptPath: error.scriptPath,
					outputDir,
					errorMessage: error.message,
					stderr: error.stderr,
				};
				logger.error('[VectorEmbeddingService] ❌ Failed to execute Python script:', error, logInfo);
			} else {
				const logInfo = {
					outputDir,
					errorMessage: error instanceof Error ? error.message : String(error),
				};
				logger.error(
					'[VectorEmbeddingService] ❌ Failed to save vectors:',
					error instanceof Error ? error : new Error(String(error)),
					logInfo,
				);
			}
			throw error;
		} finally {
			// Clean up temporary file
			try {
				logger.debug('[VectorEmbeddingService] 🧹 Cleaning up temporary file...');
				await fs.unlink(tempVectorsPath);
				logger.debug('[VectorEmbeddingService] ✅ Temporary file cleaned up');
			} catch (error) {
				logger.warn('[VectorEmbeddingService] ⚠️ Failed to clean up temporary file:', {
					tempVectorsPath,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
	}

	/**
	 * Helper method to run Python scripts with timeout
	 */
	private async runPythonScript(scriptPath: string, args: string[], timeout: number): Promise<PythonScriptResult> {
		return new Promise<PythonScriptResult>((resolve, reject) => {
			const timer = setTimeout(() => {
				const timeoutError = new PythonScriptError(
					`Python script execution timed out after ${timeout}ms`,
					scriptPath,
					{ timeout },
				);

				const logInfo = { scriptPath, timeoutMs: timeout };
				logger.error('[VectorEmbeddingService] ⏱️ Python script execution timed out', timeoutError, logInfo);

				reject(timeoutError);
			}, timeout);

			execFile('python3', [scriptPath, ...args], { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
				clearTimeout(timer);

				// Log stderr output for debugging
				if (stderr) {
					logger.debug('[VectorEmbeddingService] 📝 Python script stderr:', {
						stderr: stderr.substring(0, 1000) + (stderr.length > 1000 ? '...(truncated)' : ''),
					});
				}

				if (error) {
					const pythonError = new PythonScriptError(error.message, scriptPath, { stderr });

					const logInfo = {
						message: error.message,
						stderr: stderr?.substring(0, 500) || 'No stderr output',
					};
					logger.error('[VectorEmbeddingService] ❌ Python script error:', pythonError, logInfo);

					reject(pythonError);
				} else {
					resolve({ stdout, stderr });
				}
			});
		});
	}

	/**
	 * Load vectors from a directory
	 */
	public async loadVectors(directory: string): Promise<LoadedVectors> {
		const tempVectorsPath = path.join(directory, 'temp_vectors.json');
		const vectorsPath = path.join(directory, 'vectors.npy');
		const metadataPath = path.join(directory, 'metadata.json');
		const textsPath = path.join(directory, 'texts.json');

		logger.info('[VectorEmbeddingService] 📂 Loading vectors from directory...', { directory });

		try {
			// First check if all required files exist
			logger.debug('[VectorEmbeddingService] 🔍 Checking for required files...');

			// Check for metadata and texts files
			const [metadataExists, textsExists] = await Promise.all([
				fs
					.access(metadataPath)
					.then(() => true)
					.catch(() => false),
				fs
					.access(textsPath)
					.then(() => true)
					.catch(() => false),
			]);

			if (!metadataExists || !textsExists) {
				const fileDetails = { metadataExists, textsExists };
				const errorMsg = `Required files missing in ${directory}: metadata=${metadataExists}, texts=${textsExists}`;

				const fileError = new VectorFileError(errorMsg, directory, fileDetails);
				const logInfo = { directory, metadataExists, textsExists };
				logger.error(
					'[VectorEmbeddingService] ❌ Required metadata or texts files missing',
					fileError,
					logInfo,
				);

				throw fileError;
			}

			// Load metadata and texts
			logger.debug('[VectorEmbeddingService] 📄 Loading metadata and texts...');
			const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8')) as VectorMetadata[];
			const texts = JSON.parse(await fs.readFile(textsPath, 'utf-8')) as string[];

			logger.debug('[VectorEmbeddingService] ✅ Metadata and texts loaded', {
				metadataCount: metadata.length,
				textsCount: texts.length,
			});

			// Try NPY file first, then fall back to JSON
			const vectorsNpyExists = await fs
				.access(vectorsPath)
				.then(() => true)
				.catch(() => false);
			const vectorsJsonExists = await fs
				.access(vectorsPath.replace('.npy', '.json'))
				.then(() => true)
				.catch(() => false);

			logger.debug('[VectorEmbeddingService] 📊 Vector file availability', {
				npy: vectorsNpyExists ? '✅' : '❌',
				json: vectorsJsonExists ? '✅' : '❌',
			});

			let vectors: number[][] = [];

			// Try loading vectors from NPY
			if (vectorsNpyExists) {
				try {
					// Execute Python script to load vectors
					const scriptPath = path.join(process.cwd(), 'scripts', 'load_vectors.py');
					logger.info('[VectorEmbeddingService] 🐍 Executing Python script to load NPY', {
						scriptPath,
						vectorsPath,
						tempVectorsPath,
					});

					const { stdout } = await this.runPythonScript(
						scriptPath,
						['--input', vectorsPath, '--output', tempVectorsPath],
						30000,
					);

					// Parse stdout as JSON
					try {
						const _result = JSON.parse(stdout);
						if (_result.status === 'success') {
							logger.info('[VectorEmbeddingService] ✅ NPY vectors loaded successfully', {
								shape: _result.shape,
								dtype: _result.dtype,
								outputPath: _result.output_path,
							});

							// Load vectors from temporary JSON file
							vectors = JSON.parse(await fs.readFile(tempVectorsPath, 'utf-8')) as number[][];
							logger.debug('[VectorEmbeddingService] ✅ Vectors loaded from temp JSON', {
								count: vectors.length,
								dimensions: vectors[0]?.length || 0,
							});
						} else if (_result.status === 'warning') {
							logger.warn('[VectorEmbeddingService] ⚠️ Python script warning:', {
								message: _result.message,
								outputPath: _result.output_path,
							});
							throw new Error(`Python script returned warning: ${_result.message}`);
						} else {
							throw new Error(`Python script returned unexpected status: ${_result.status}`);
						}
					} catch (e) {
						const parseError = new Error(
							`Failed to parse Python script output: ${e instanceof Error ? e.message : String(e)}`,
						);
						const logInfo = {
							errorDetails: e instanceof Error ? e.message : String(e),
							stdoutSnippet: stdout.substring(0, 500),
						};
						logger.error('[VectorEmbeddingService] ❌ Failed to parse Python output:', parseError, logInfo);
						throw parseError;
					}
				} catch (npyError) {
					logger.warn('[VectorEmbeddingService] ⚠️ Failed to load NPY file:', {
						errorDetails: npyError instanceof Error ? npyError.message : String(npyError),
						fallback: vectorsJsonExists ? 'Using JSON backup' : 'No fallback available',
					});

					// Fall back to JSON if available
					if (vectorsJsonExists) {
						logger.info('[VectorEmbeddingService] 🔄 Falling back to JSON vector format');
						vectors = JSON.parse(
							await fs.readFile(vectorsPath.replace('.npy', '.json'), 'utf-8'),
						) as number[][];
						logger.debug('[VectorEmbeddingService] ✅ Vectors loaded from JSON backup', {
							count: vectors.length,
							dimensions: vectors[0]?.length || 0,
						});
					} else {
						const fileDetails = { vectorsNpyExists, vectorsJsonExists };
						const errorMsg = 'No vector data available - both NPY and JSON formats missing or invalid';
						const fileError = new VectorFileError(errorMsg, directory, fileDetails);
						throw fileError;
					}
				} finally {
					// Clean up temporary file
					try {
						await fs.unlink(tempVectorsPath);
					} catch (error) {
						logger.warn('[VectorEmbeddingService] ⚠️ Failed to clean up temporary file:', {
							tempVectorsPath,
							errorDetails: error instanceof Error ? error.message : String(error),
						});
					}
				}
			} else if (vectorsJsonExists) {
				// Load directly from JSON
				logger.info('[VectorEmbeddingService] 📄 Loading vectors directly from JSON file');
				vectors = JSON.parse(await fs.readFile(vectorsPath.replace('.npy', '.json'), 'utf-8')) as number[][];
				logger.debug('[VectorEmbeddingService] ✅ Vectors loaded from JSON', {
					count: vectors.length,
					dimensions: vectors[0]?.length || 0,
				});
			} else {
				const fileDetails = { vectorsNpyExists, vectorsJsonExists };
				const errorMsg = `No vector data found in ${directory} - neither NPY nor JSON format exists`;
				const fileError = new VectorFileError(errorMsg, directory, fileDetails);

				const logInfo = { directory, vectorsNpyExists, vectorsJsonExists };
				logger.error('[VectorEmbeddingService] ❌ No vector data available', fileError, logInfo);

				throw fileError;
			}

			// Convert to Float32Array
			logger.debug('[VectorEmbeddingService] 🔄 Converting vectors to Float32Array...');
			const vectorsFloat32 = vectors.map((v) => new Float32Array(v));

			const _result = {
				vectors: vectorsFloat32,
				metadata,
				texts,
			};

			logger.info('[VectorEmbeddingService] ✅ Vector loading complete', {
				vectorCount: vectorsFloat32.length,
				metadataCount: metadata.length,
				textsCount: texts.length,
				dimensions: vectorsFloat32[0]?.length || 0,
			});

			return _result;
		} catch (error) {
			if (error instanceof VectorFileError) {
				const logInfo = {
					directory: error.directoryPath,
					fileStatus: error.fileDetails,
					errorMessage: error.message,
				};
				logger.error('[VectorEmbeddingService] ❌ Failed to load vectors:', error, logInfo);
			} else {
				const logInfo = {
					directory,
					errorMessage: error instanceof Error ? error.message : String(error),
				};
				logger.error(
					'[VectorEmbeddingService] ❌ Failed to load vectors:',
					error instanceof Error ? error : new Error(String(error)),
					logInfo,
				);
			}
			throw error;
		}
	}

	public isInitialized(): boolean {
		return this.initialized;
	}

	public getModelName(): string {
		return this.modelName;
	}
}
