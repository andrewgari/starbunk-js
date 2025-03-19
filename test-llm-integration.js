// Test LLM integration with the application's LLM manager
require('dotenv').config();

const { LLMManager } = require('./dist/services/llm/llmManager');
const { getLogger } = require('./dist/services/logger');
const { LLMProviderType } = require('./dist/services/llm/llmFactory');

async function testLLMIntegration() {
	console.log('=== Testing LLM Integration ===');
	const logger = getLogger();

	try {
		// Create an LLM manager instance with Ollama as the primary provider
		console.log('Creating LLM Manager...');
		const llmManager = new LLMManager(logger, LLMProviderType.OLLAMA);

		// Initialize providers
		console.log('Initializing providers...');
		await llmManager.initializeAllProviders();

		// List all providers that were initialized
		console.log('Checking available providers...');
		for (const type of Object.values(LLMProviderType)) {
			const isAvailable = llmManager.isProviderAvailable(type);
			console.log(`- ${type}: ${isAvailable ? 'Available' : 'Not available'}`);
		}

		// Check if Ollama is available
		const isOllamaAvailable = llmManager.isProviderAvailable(LLMProviderType.OLLAMA);
		console.log('Ollama available:', isOllamaAvailable);

		if (isOllamaAvailable) {
			// Get the Ollama provider
			const ollamaProvider = llmManager.getProvider(LLMProviderType.OLLAMA);
			console.log('Ollama provider name:', ollamaProvider.getProviderName());
			console.log('Available models:', ollamaProvider.getAvailableModels());

			// Test a simple completion
			console.log('\nTesting a simple completion...');
			const response = await llmManager.createCompletion(
				LLMProviderType.OLLAMA,
				{
					model: ollamaProvider.getAvailableModels()[0],
					messages: [
						{
							role: 'system',
							content: 'You are a helpful assistant that provides very short, concise answers.'
						},
						{
							role: 'user',
							content: 'What is the capital of France?'
						}
					],
					temperature: 0.1
				}
			);

			console.log('Completion response:', response);

			console.log('\n✓ Ollama integration test completed successfully!');
		} else {
			console.error('✗ Ollama provider is not available');
		}
	} catch (error) {
		console.error('✗ LLM integration test failed:', error);
	}
}

// Run the test
testLLMIntegration().catch(error => {
	console.error('Fatal error running test:', error);
});
