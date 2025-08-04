import { OllamaService } from '../services/ollama/ollamaService';

describe('OllamaService', () => {
	let ollamaService: OllamaService;

	beforeEach(() => {
		ollamaService = new OllamaService('http://localhost:11434', 'llama2');
	});

	describe('constructor', () => {
		it('should initialize with default values', () => {
			const service = new OllamaService();
			expect(service).toBeDefined();
		});

		it('should initialize with custom values', () => {
			const service = new OllamaService('http://custom:11434', 'custom-model');
			expect(service).toBeDefined();
		});
	});

	describe('getHealthInfo', () => {
		it('should return health information', async () => {
			const healthInfo = await ollamaService.getHealthInfo();
			
			expect(healthInfo).toHaveProperty('available');
			expect(healthInfo).toHaveProperty('models');
			expect(healthInfo).toHaveProperty('defaultModel');
			expect(healthInfo).toHaveProperty('baseUrl');
			expect(healthInfo.defaultModel).toBe('llama2');
			expect(healthInfo.baseUrl).toBe('http://localhost:11434');
		});
	});

	describe('isModelAvailable', () => {
		it('should handle model availability check gracefully', async () => {
			// This will likely fail since Ollama isn't running, but should not throw
			const isAvailable = await ollamaService.isModelAvailable('llama2');
			expect(typeof isAvailable).toBe('boolean');
		});
	});
});
