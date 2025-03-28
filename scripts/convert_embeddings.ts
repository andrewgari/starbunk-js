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

		// Parse the .npy file format (simplified approach)
		// Skip the header (first 128 bytes is usually sufficient for simple .npy files)
		const dataBuffer = buffer.slice(128);

		// Convert to Float32Array
		const embedding = new Float32Array(dataBuffer.buffer, dataBuffer.byteOffset, dataBuffer.length / 4);

		// Convert to array and JSON
		const jsonData = Array.from(embedding);

		// Create output path
		const jsonPath = filePath.replace('.npy', '.json');

		// Write to JSON file
		await fs.writeFile(jsonPath, JSON.stringify(jsonData), 'utf-8');

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
		const dirName = path.dirname(relativeToType);
		const namespace = `${campaignId}_${dirName.replace(/[\\]/g, '_')}`;

		// Determine vector output location
		const outputDir = path.join(CONTEXT_DIR, campaignId);
		const vectorDir = path.join(outputDir, namespace);
		const vectorJsonPath = path.join(vectorDir, 'vectors.json');
		const metadataPath = path.join(vectorDir, 'metadata.json');

		// Check if vectorization is needed by comparing file modification times
		if (!force && await fileExists(vectorJsonPath) && await fileExists(metadataPath)) {
			// Get the modification times
			const docStats = await fs.stat(filePath);
			const vectorStats = await fs.stat(vectorJsonPath);

			// Skip if vector file is newer than document
			if (vectorStats.mtime > docStats.mtime) {
				console.log(`Skipping unchanged document: ${relativePath}`);
				return;
			}
		}

		console.log(`Processing document: ${relativePath}`);

		// Read file
		const content = await fs.readFile(filePath, 'utf-8');

		// Skip if empty
		if (!content.trim()) {
			console.log(`Skipping empty file: ${relativePath}`);
			return;
		}

		// Process content in chunks if larger than chunk size
		let chunks: string[] = [];
		if (content.length > CHUNK_SIZE) {
			console.log(`Chunking large file (${content.length} chars): ${relativePath}`);
			// Simple chunking by characters
			for (let i = 0; i < content.length; i += CHUNK_SIZE) {
				chunks.push(content.substring(i, i + CHUNK_SIZE));
			}
		} else {
			chunks = [content];
		}

		// Ensure output directory exists
		await fs.mkdir(outputDir, { recursive: true });

		// Generate embeddings
		console.log(`Generating embeddings for ${chunks.length} chunks...`);
		const embeddings = await embeddingService.generateEmbeddings(chunks);

		// Build metadata
		const metadata = chunks.map(() => ({
			file: path.relative(path.join(CAMPAIGNS_DIR, campaignId), filePath),
			is_gm_content: isGM,
			chunk_size: CHUNK_SIZE
		}));

		// Save vectors
		await embeddingService.saveVectors(
			embeddings,
			metadata,
			chunks,
			vectorDir
		);

		console.log(`Successfully created embeddings for: ${relativePath}`);
	} catch (error) {
		console.error(`Error processing document ${filePath}:`, error);
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
