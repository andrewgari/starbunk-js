import fs from 'fs/promises';
import path from 'path';
import { VectorEmbeddingService } from '../src/starbunk/services/vectorEmbeddingService';

async function testVectorGeneration() {
	try {
		// Initialize the service
		const service = VectorEmbeddingService.getInstance();
		await service.initialize();

		// Sample text for testing
		const sampleText = 'This is a test note about a magical sword found in the dungeon.';
		console.log('Generating embeddings...');

		// Generate embeddings
		const embeddings = await service.generateEmbeddings([sampleText]);

		// Convert Float32Array to regular arrays
		const embeddingsArray = embeddings.map(embedding => Array.from(embedding));

		// Create output directory
		const outputDir = path.join(process.cwd(), 'data', 'test_vectors');
		await fs.mkdir(outputDir, { recursive: true });

		console.log('Saving vectors...');

		// Save vectors
		await service.saveVectors(
			embeddingsArray,
			[{
				file: 'test_note.txt',
				is_gm_content: false,
				chunk_size: sampleText.length
			}],
			[sampleText],
			outputDir
		);

		console.log('Loading vectors...');

		// Load vectors back
		const loaded = await service.loadVectors(outputDir);

		// Verify the data
		console.log('Verifying data...');
		console.log('Original text:', sampleText);
		console.log('Loaded text:', loaded.texts[0]);
		console.log('Original vector length:', embeddings[0].length);
		console.log('Loaded vector length:', loaded.vectors[0].length);
		console.log('Metadata:', loaded.metadata[0]);
		console.log('Test completed successfully!');
	} catch (error) {
		console.error('Test failed:', error);
	}
}

testVectorGeneration();
