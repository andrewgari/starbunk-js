// Basic test for CovaBot container bootstrap
describe('CovaBot Container', () => {
	it('should have minimal bootstrap functionality', () => {
		// Test that the container can be imported without errors
		expect(() => {
			require('../src/index');
		}).not.toThrow();
	});

	it('should handle optional LLM services', () => {
		// Should work with or without LLM API keys
		const originalOpenAI = process.env.OPENAI_API_KEY;
		const originalOllama = process.env.OLLAMA_API_URL;
		
		delete process.env.OPENAI_API_KEY;
		delete process.env.OLLAMA_API_URL;
		
		expect(() => {
			const { validateEnvironment } = require('@starbunk/shared');
			validateEnvironment({
				required: ['STARBUNK_TOKEN'],
				optional: ['DATABASE_URL', 'OPENAI_API_KEY', 'OLLAMA_API_URL']
			});
		}).not.toThrow();

		// Restore environment
		if (originalOpenAI) process.env.OPENAI_API_KEY = originalOpenAI;
		if (originalOllama) process.env.OLLAMA_API_URL = originalOllama;
	});
});
