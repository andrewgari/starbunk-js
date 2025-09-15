/**
 * Mock implementation of @xenova/transformers for testing
 * Provides fake embedding generation without loading actual models
 */

export interface Pipeline {
	(text: string, options?: any): Promise<{ data: Float32Array }>;
}

// Mock pipeline function that returns fake embeddings
const mockPipeline: Pipeline = async (text: string, options?: any) => {
	// Generate deterministic fake embeddings based on text content
	const textHash = text.split('').reduce((hash, char) => {
		return ((hash << 5) - hash + char.charCodeAt(0)) & 0xffffffff;
	}, 0);

	// Create a 384-dimensional vector (matching all-MiniLM-L6-v2)
	const dimensions = 384;
	const data = new Float32Array(dimensions);

	// Fill with deterministic values based on text hash
	for (let i = 0; i < dimensions; i++) {
		// Create pseudo-random but deterministic values
		const seed = textHash + i;
		data[i] = (Math.sin(seed) + Math.cos(seed * 2)) / 2;
	}

	return { data };
};

// Mock pipeline factory
export const pipeline = jest.fn().mockImplementation(async (task: string, model: string, options?: any) => {
	// Simulate model loading delay
	await new Promise((resolve) => setTimeout(resolve, 10));

	return mockPipeline;
});

// Export other types that might be imported
// export type { Pipeline }; // Commented out to avoid conflicts

// Default export for compatibility
export default {
	pipeline,
};
