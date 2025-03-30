#!/usr/bin/env node

/**
 * This script:
 * 1. Converts existing .npy vector embeddings to .json format
 * 2. Processes all campaign documents (txt, md) to create vector embeddings
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { VectorEmbeddingService } from '../src/starbunk/services/vectorEmbeddingService';

// Configure paths
const CONTEXT_DIR = path.join(process.cwd(), 'data', 'llm_context');
const CAMPAIGNS_DIR = path.join(process.cwd(), 'data', 'campaigns');
const CHUNK_SIZE = 512; // Size of text chunks

// Initialize services
const embeddingService = VectorEmbeddingService.getInstance();

// File types to process
const TEXT_FILE_EXTENSIONS = ['.txt', '.md', '.json'];

/**
 * Convert .npy embedding files to .json format
 */
async function convertNpyToJson(filePath: string): Promise<void> {
	try {
		// Check if file exists and is a .npy file
		if (!filePath.endsWith('.npy')) {
			return;
		}

		console.log(`Converting NPY file: ${filePath}`);

		// Read the .npy file
		const buffer = await fs.readFile(filePath);
		console.log(`[NPY Info] File size: ${buffer.length} bytes`);

		// Parse the .npy file format to determine the correct header size
		const headerLength = buffer.readUInt32LE(8) + 10;
		console.log(`[NPY Info] Detected header length: ${headerLength} bytes`);
		
		// Log first 20 bytes of header for debugging
		const headerPrefix = Array.from(buffer.slice(0, Math.min(20, headerLength)))
			.map(b => b.toString(16).padStart(2, '0'))
			.join(' ');
		console.log(`[NPY Info] Header prefix (hex): ${headerPrefix}...`);
		
		const dataBuffer = buffer.slice(headerLength);
		console.log(`[NPY Info] Data buffer size: ${dataBuffer.length} bytes`);
		
		// Convert to Float32Array
		const embedding = new Float32Array(dataBuffer.buffer, dataBuffer.byteOffset, dataBuffer.length / 4);
		console.log(`[NPY Info] Converted to Float32Array with ${embedding.length} elements`);
		
		// Debug sample of embedding values
		if (embedding.length > 0) {
			const sampleValues = Array.from(embedding.slice(0, 5)).map(v => v.toFixed(4));
			console.log(`[NPY Info] First 5 embedding values: [${sampleValues.join(', ')}...]`);
		}

		// Convert to array and JSON
		const jsonData = Array.from(embedding);
		console.log(`[NPY Info] Vector dimensions: ${jsonData.length}`);

		// Create output path
		const jsonPath = filePath.replace('.npy', '.json');

		// Write to JSON file
		await fs.writeFile(jsonPath, JSON.stringify(jsonData), 'utf-8');
		const stats = await fs.stat(jsonPath);
		console.log(`[NPY Info] JSON file size: ${stats.size} bytes (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

		console.log(`Successfully converted to: ${jsonPath}`);
	} catch (error) {
		console.error(`Error converting ${filePath}:`, error);
	}
}

/**
 * Convert campaign text documents to vector embeddings
 * Only processes files that are new or modified since last run
 */
async function processDocumentToVector(
	filePath: string,
	campaignId: string,
	isGM: boolean,
	force: boolean = false
): Promise<void> {
	try {
		// Skip files that are not text files
		const ext = path.extname(filePath).toLowerCase();
		if (!TEXT_FILE_EXTENSIONS.includes(ext)) {
			return;
		}

		// Get relative path for display
		const relativePath = path.relative(CAMPAIGNS_DIR, filePath);

		// Create namespace based on file path
		const relativeToType = path.relative(path.join(CAMPAIGNS_DIR, campaignId), filePath);
		let dirName = path.dirname(relativeToType);
		if (dirName === '.') {
			dirName = '';
		}
		const namespace = `${campaignId}_${dirName.replace(/[\\]/g, '_')}`;

		// Determine vector output location
		const outputDir = path.join(CONTEXT_DIR, campaignId);
		const vectorDir = path.join(outputDir, namespace);
		const vectorJsonPath = path.join(vectorDir, 'vectors.json');
		const metadataPath = path.join(vectorDir, 'metadata.json');

		console.log(`[TokenizeDoc] Processing: ${relativePath}`);
		console.log(`[TokenizeDoc] Output location: ${vectorDir}`);

		// Check if vectorization is needed by comparing file modification times
		if (!force && await fileExists(vectorJsonPath) && await fileExists(metadataPath)) {
			// Get the modification times
			const docStats = await fs.stat(filePath);
			const vectorStats = await fs.stat(vectorJsonPath);

			// Skip if vector file is newer than document
			if (vectorStats.mtime > docStats.mtime) {
				console.log(`[TokenizeDoc] Skipping unchanged document: ${relativePath} (doc: ${docStats.mtime.toISOString()}, vector: ${vectorStats.mtime.toISOString()})`);
				return;
			}
			console.log(`[TokenizeDoc] File has been modified, regenerating vectors`);
		}

		console.log(`[TokenizeDoc] Reading file content: ${relativePath}`);

		// Read file
		const content = await fs.readFile(filePath, 'utf-8');
		console.log(`[TokenizeDoc] File size: ${content.length} characters`);

		// Log file content sample
		const contentPreview = content.length > 200 ? 
			`${content.substring(0, 200)}...` : content;
		console.log(`[TokenizeDoc] Content preview: ${contentPreview}`);

		// Skip if empty
		if (!content.trim()) {
			console.log(`[TokenizeDoc] Skipping empty file: ${relativePath}`);
			return;
		}

		// Process content in chunks if larger than chunk size
		let chunks: string[] = [];
		if (content.length > CHUNK_SIZE) {
			console.log(`[TokenizeDoc] Chunking large file (${content.length} chars) into ${Math.ceil(content.length / CHUNK_SIZE)} chunks`);
			
			// Simple chunking by characters
			for (let i = 0; i < content.length; i += CHUNK_SIZE) {
				const chunk = content.substring(i, i + CHUNK_SIZE);
				chunks.push(chunk);
				
				// Log first and last chunk for verification
				if (i === 0 || i + CHUNK_SIZE >= content.length) {
					const chunkNum = Math.floor(i / CHUNK_SIZE) + 1;
					const totalChunks = Math.ceil(content.length / CHUNK_SIZE);
					const chunkPreview = chunk.length > 100 ? `${chunk.substring(0, 100)}...` : chunk;
					
					console.log(`[TokenizeDoc] Chunk ${chunkNum}/${totalChunks} preview (${chunk.length} chars): ${chunkPreview}`);
				}
			}
		} else {
			chunks = [content];
			console.log(`[TokenizeDoc] Content fits in a single chunk (${content.length} < ${CHUNK_SIZE})`);
		}

		// Token count estimation (rough estimate)
		const estimatedTokens = chunks.reduce((sum, chunk) => sum + Math.round(chunk.length / 4), 0);
		console.log(`[TokenizeDoc] Estimated token count: ~${estimatedTokens} tokens (${chunks.length} chunks)`);

		// Ensure output directory exists
		console.log(`[TokenizeDoc] Creating output directory: ${vectorDir}`);
		await fs.mkdir(vectorDir, { recursive: true });

		// Generate embeddings
		console.log(`[TokenizeDoc] Generating embeddings for ${chunks.length} chunks...`);
		const startTime = Date.now();
		const embeddings = await embeddingService.generateEmbeddings(chunks);
		const processingTime = Date.now() - startTime;
		
		console.log(`[TokenizeDoc] Embedding generation complete in ${processingTime}ms`);
		console.log(`[TokenizeDoc] Generated ${embeddings.length} embeddings, each with ${embeddings[0]?.length || 0} dimensions`);

		// Build metadata
		const metadata = chunks.map((_, index) => ({
			file: path.relative(path.join(CAMPAIGNS_DIR, campaignId), filePath),
			is_gm_content: isGM,
			chunk_size: CHUNK_SIZE,
			chunk_index: index,
			total_chunks: chunks.length
		}));

		console.log(`[TokenizeDoc] Saving vectors and metadata to: ${vectorDir}`);

		// Save vectors - convert Float32Array to number[][]
		await embeddingService.saveVectors(
			embeddings.map(arr => Array.from(arr)),
			metadata,
			chunks,
			vectorDir
		);

		console.log(`[TokenizeDoc] Successfully created embeddings for: ${relativePath}`);
		
		// Verify files were created properly
		const [npyExists, jsonExists, metaExists, textsExists] = await Promise.all([
			fileExists(path.join(vectorDir, 'vectors.npy')),
			fileExists(path.join(vectorDir, 'vectors.json')),
			fileExists(path.join(vectorDir, 'metadata.json')),
			fileExists(path.join(vectorDir, 'texts.json'))
		]);
		
		console.log(`[TokenizeDoc] Verification results:`, {
			'vectors.npy': npyExists ? '✅' : '❌',
			'vectors.json': jsonExists ? '✅' : '❌',
			'metadata.json': metaExists ? '✅' : '❌',
			'texts.json': textsExists ? '✅' : '❌'
		});
	} catch (error) {
		console.error(`[TokenizeDoc] ❌ Error processing document ${filePath}:`, error);
	}
}

/**
 * Process campaign directory and its content
 */
async function processCampaignDirectory(campaignDir: string, force: boolean = false): Promise<void> {
	try {
		const campaignId = path.basename(campaignDir);
		console.log(`\nProcessing campaign: ${campaignId}`);

		// Get GM and player directories
		const gmDir = path.join(campaignDir, 'gm');
		const playerDir = path.join(campaignDir, 'player');

		// Process directories if they exist
		if (await directoryExists(gmDir)) {
			await processContentDirectory(gmDir, campaignId, true, force);
		}

		if (await directoryExists(playerDir)) {
			await processContentDirectory(playerDir, campaignId, false, force);
		}
	} catch (error) {
		console.error(`Error processing campaign directory ${campaignDir}:`, error);
	}
}

/**
 * Process all files in a content directory
 */
async function processContentDirectory(
	dir: string,
	campaignId: string,
	isGM: boolean,
	force: boolean = false
): Promise<void> {
	try {
		const entries = await fs.readdir(dir, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);

			if (entry.isDirectory()) {
				// Recursively process subdirectories
				await processContentDirectory(fullPath, campaignId, isGM, force);
			} else if (entry.isFile()) {
				// Process documents to vectors
				await processDocumentToVector(fullPath, campaignId, isGM, force);
			}
		}
	} catch (error) {
		console.error(`Error processing content directory ${dir}:`, error);
	}
}

/**
 * Process vectorization of existing NPY files
 */
async function processNpyDirectory(dir: string): Promise<void> {
	try {
		const entries = await fs.readdir(dir, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);

			if (entry.isDirectory()) {
				// Recursively process subdirectories
				await processNpyDirectory(fullPath);
			} else if (entry.isFile() && entry.name.endsWith('.npy')) {
				// Convert NPY files
				await convertNpyToJson(fullPath);
			}
		}
	} catch (error) {
		console.error(`Error processing directory ${dir}:`, error);
	}
}

/**
 * Check if a directory exists
 */
async function directoryExists(directory: string): Promise<boolean> {
	try {
		const stats = await fs.stat(directory);
		return stats.isDirectory();
	} catch (error) {
		return false;
	}
}

/**
 * Check if a file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
	try {
		const stats = await fs.stat(filePath);
		return stats.isFile();
	} catch (error) {
		return false;
	}
}

/**
 * Main function
 */
async function main(): Promise<void> {
	try {
		// Parse command line arguments
		const args = process.argv.slice(2);
		const forceArg = args.includes('--force') || args.includes('-f');
		const specificCampaign = args.find(arg => arg.startsWith('--campaign='))?.split('=')[1];
		const skipNpyConversion = args.includes('--skip-npy');

		console.log('Vectorization Options:');
		if (forceArg) console.log('- Force re-processing all files');
		if (specificCampaign) console.log(`- Processing only campaign: ${specificCampaign}`);
		if (skipNpyConversion) console.log('- Skipping NPY conversion');

		console.log('\nInitializing embedding service...');
		await embeddingService.initialize();

		// Step 1: Convert existing NPY files to JSON (unless skipped)
		if (!skipNpyConversion) {
			console.log('\n==== Converting NPY files to JSON format ====');
			await processNpyDirectory(CONTEXT_DIR);
		}

		// Step 2: Process campaign documents
		console.log('\n==== Processing campaign documents to vectors ====');

		// Get list of campaigns
		let campaignDirs: string[] = [];

		if (specificCampaign) {
			// Process only specific campaign
			const campaignDir = path.join(CAMPAIGNS_DIR, specificCampaign);
			if (await directoryExists(campaignDir)) {
				campaignDirs = [campaignDir];
			} else {
				throw new Error(`Campaign directory not found: ${specificCampaign}`);
			}
		} else {
			// Process all campaigns
			const campaignEntries = await fs.readdir(CAMPAIGNS_DIR, { withFileTypes: true });
			campaignDirs = campaignEntries
				.filter(entry => entry.isDirectory())
				.map(entry => path.join(CAMPAIGNS_DIR, entry.name));
		}

		// Process each campaign
		console.log(`Found ${campaignDirs.length} campaign(s) to process`);
		for (const campaignDir of campaignDirs) {
			await processCampaignDirectory(campaignDir, forceArg);
		}

		console.log('\nConversion and vectorization complete!');
	} catch (error) {
		console.error('Error in main process:', error);
		process.exit(1);
	}
}

// Run the script
main();
