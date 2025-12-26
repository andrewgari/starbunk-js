/**
 * Example script demonstrating how to use the Gemini provider
 *
 * To run this example:
 * 1. Get a free Gemini API key from: https://aistudio.google.com/app/apikey
 * 2. Set the GEMINI_API_KEY environment variable:
 *    export GEMINI_API_KEY=your-api-key-here
 * 3. Run this script:
 *    npx ts-node packages/shared/src/services/llm/examples/gemini-example.ts
 */

import { LLMFactory, LLMProviderType } from '../llmFactory';
import { Logger } from '../../logger';

async function main() {
	// Create a simple logger
	const logger: Logger = {
		debug: (message: string) => console.log(`[DEBUG] ${message}`),
		info: (message: string) => console.log(`[INFO] ${message}`),
		warn: (message: string) => console.warn(`[WARN] ${message}`),
		error: (message: string, error?: Error) => {
			console.error(`[ERROR] ${message}`);
			if (error) console.error(error);
		},
	} as Logger;

	// Check if API key is set
	if (!process.env.GEMINI_API_KEY) {
		console.error('Error: GEMINI_API_KEY environment variable is not set');
		console.error('Get your free API key from: https://aistudio.google.com/app/apikey');
		console.error('Then run: export GEMINI_API_KEY=your-api-key-here');
		process.exit(1);
	}

	console.log('Creating Gemini provider...');

	// Create the Gemini provider
	const provider = LLMFactory.createProviderFromEnv(LLMProviderType.GEMINI, logger);

	// Initialize the provider
	console.log('Initializing provider...');
	const initialized = await provider.initialize();

	if (!initialized) {
		console.error('Failed to initialize Gemini provider');
		process.exit(1);
	}

	console.log('Provider initialized successfully!');
	console.log(`Provider name: ${provider.getProviderName()}`);
	console.log(`Available models: ${provider.getAvailableModels().join(', ')}`);

	// Test a simple completion
	console.log('\nTesting completion...');
	const response = await provider.createCompletion({
		messages: [
			{
				role: 'system',
				content: 'You are a helpful assistant.',
			},
			{
				role: 'user',
				content: 'Say hello and introduce yourself in one sentence.',
			},
		],
		temperature: 0.7,
	});

	console.log('\nResponse:');
	console.log(`Content: ${response.content}`);
	if (response.usage) {
		console.log(`Tokens used: ${response.usage.totalTokens}`);
	}
}

main().catch((error) => {
	console.error('Error running example:', error);
	process.exit(1);
});

