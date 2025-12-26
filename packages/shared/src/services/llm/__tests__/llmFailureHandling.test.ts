/**
 * Comprehensive tests for LLM service failure scenarios
 *
 * These tests verify that:
 * 1. LLM connection failures are handled gracefully
 * 2. LLM service unreachable scenarios are handled
 * 3. LLM error responses are handled
 * 4. OpenAI fallback is OPT-IN only (disabled by default)
 * 5. System degrades gracefully when LLM is unavailable
 */

import { LLMManager } from '../llmManager';
import { LLMProviderType } from '../llmProvider';
import { Logger } from '../../logger';
import { OllamaProvider } from '../providers/ollamaProvider';
import { OpenAIProvider } from '../providers/openaiProvider';

// Mock the providers
jest.mock('../providers/ollamaProvider');
jest.mock('../providers/openaiProvider');

// Create a proper mock logger
const mockLogger: jest.Mocked<Logger> = {
	debug: jest.fn(),
	info: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
	success: jest.fn(),
	formatMessage: jest.fn(),
	getCallerInfo: jest.fn().mockReturnValue('test-caller'),
	setLogLevel: jest.fn(),
	setServiceName: jest.fn(),
} as any;

describe('LLM Failure Handling', () => {
	let llmManager: LLMManager;

	beforeEach(() => {
		jest.clearAllMocks();
		llmManager = new LLMManager(mockLogger, LLMProviderType.OLLAMA);
	});

	describe('Connection Failures', () => {
		it('should handle Ollama connection failure gracefully', async () => {
			// Mock Ollama provider to fail initialization
			const mockOllamaProvider = {
				initialize: jest.fn().mockResolvedValue(false),
				isInitialized: jest.fn().mockReturnValue(false),
				getProviderName: jest.fn().mockReturnValue('Ollama'),
				getAvailableModels: jest.fn().mockReturnValue([]),
				createCompletion: jest.fn().mockRejectedValue(new Error('Connection refused')),
			};

			(OllamaProvider as jest.Mock).mockImplementation(() => mockOllamaProvider);

			// Try to initialize
			const initialized = await llmManager.initializeProvider(LLMProviderType.OLLAMA);

			// Should fail gracefully
			expect(initialized).toBe(false);
			expect(mockLogger.error).toHaveBeenCalled();
		});

		it('should handle Ollama service unreachable', async () => {
			// Mock Ollama provider to be initialized but fail on completion
			const mockOllamaProvider = {
				initialize: jest.fn().mockResolvedValue(true),
				isInitialized: jest.fn().mockReturnValue(true),
				getProviderName: jest.fn().mockReturnValue('Ollama'),
				getAvailableModels: jest.fn().mockReturnValue(['llama3']),
				createCompletion: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')),
			};

			(OllamaProvider as jest.Mock).mockImplementation(() => mockOllamaProvider);

			await llmManager.initializeProvider(LLMProviderType.OLLAMA);

			// Try to create completion
			await expect(
				llmManager.createCompletion({
					messages: [{ role: 'user', content: 'test' }],
					provider: LLMProviderType.OLLAMA,
				}),
			).rejects.toThrow();

			expect(mockLogger.error).toHaveBeenCalled();
		});

		it('should handle LLM error responses', async () => {
			// Mock Ollama provider to return error response
			const mockOllamaProvider = {
				initialize: jest.fn().mockResolvedValue(true),
				isInitialized: jest.fn().mockReturnValue(true),
				getProviderName: jest.fn().mockReturnValue('Ollama'),
				getAvailableModels: jest.fn().mockReturnValue(['llama3']),
				createCompletion: jest.fn().mockRejectedValue(new Error('Model not found')),
			};

			(OllamaProvider as jest.Mock).mockImplementation(() => mockOllamaProvider);

			await llmManager.initializeProvider(LLMProviderType.OLLAMA);

			// Try to create completion
			await expect(
				llmManager.createCompletion({
					messages: [{ role: 'user', content: 'test' }],
					provider: LLMProviderType.OLLAMA,
				}),
			).rejects.toThrow('Model not found');
		});
	});

	describe('OpenAI Fallback Behavior', () => {
		it('should NOT fallback to OpenAI by default when Ollama fails', async () => {
			// Mock Ollama to fail
			const mockOllamaProvider = {
				initialize: jest.fn().mockResolvedValue(true),
				isInitialized: jest.fn().mockReturnValue(true),
				getProviderName: jest.fn().mockReturnValue('Ollama'),
				getAvailableModels: jest.fn().mockReturnValue(['llama3']),
				createCompletion: jest.fn().mockRejectedValue(new Error('Ollama failed')),
			};

			// Mock OpenAI to succeed
			const mockOpenAIProvider = {
				initialize: jest.fn().mockResolvedValue(true),
				isInitialized: jest.fn().mockReturnValue(true),
				getProviderName: jest.fn().mockReturnValue('OpenAI'),
				getAvailableModels: jest.fn().mockReturnValue(['gpt-3.5-turbo']),
				createCompletion: jest.fn().mockResolvedValue({
					content: 'OpenAI response',
					model: 'gpt-3.5-turbo',
					provider: 'OpenAI',
				}),
			};

			(OllamaProvider as jest.Mock).mockImplementation(() => mockOllamaProvider);
			(OpenAIProvider as jest.Mock).mockImplementation(() => mockOpenAIProvider);

			await llmManager.initializeProvider(LLMProviderType.OLLAMA);
			await llmManager.initializeProvider(LLMProviderType.OPENAI);

			// Try to create completion WITHOUT explicit fallback option
			await expect(
				llmManager.createCompletion({
					messages: [{ role: 'user', content: 'test' }],
					provider: LLMProviderType.OLLAMA,
				}),
			).rejects.toThrow('Ollama failed');

			// OpenAI should NOT have been called
			expect(mockOpenAIProvider.createCompletion).not.toHaveBeenCalled();
		});

		it('should fallback to OpenAI ONLY when explicitly enabled', async () => {
			// Mock Ollama to fail
			const mockOllamaProvider = {
				initialize: jest.fn().mockResolvedValue(true),
				isInitialized: jest.fn().mockReturnValue(true),
				getProviderName: jest.fn().mockReturnValue('Ollama'),
				getAvailableModels: jest.fn().mockReturnValue(['llama3']),
				createCompletion: jest.fn().mockRejectedValue(new Error('Ollama failed')),
			};

			// Mock OpenAI to succeed
			const mockOpenAIProvider = {
				initialize: jest.fn().mockResolvedValue(true),
				isInitialized: jest.fn().mockReturnValue(true),
				getProviderName: jest.fn().mockReturnValue('OpenAI'),
				getAvailableModels: jest.fn().mockReturnValue(['gpt-3.5-turbo']),
				createCompletion: jest.fn().mockResolvedValue({
					content: 'OpenAI response',
					model: 'gpt-3.5-turbo',
					provider: 'OpenAI',
				}),
			};

			(OllamaProvider as jest.Mock).mockImplementation(() => mockOllamaProvider);
			(OpenAIProvider as jest.Mock).mockImplementation(() => mockOpenAIProvider);

			await llmManager.initializeProvider(LLMProviderType.OLLAMA);
			await llmManager.initializeProvider(LLMProviderType.OPENAI);

			// Try to create completion WITH explicit fallback option
			const result = await llmManager.createCompletion(
				{
					messages: [{ role: 'user', content: 'test' }],
					provider: LLMProviderType.OLLAMA,
				},
				{ useOpenAiFallback: true }, // Explicitly enable fallback
			);

			// Should have fallen back to OpenAI
			expect(result.content).toBe('OpenAI response');
			expect(mockOpenAIProvider.createCompletion).toHaveBeenCalled();
		});

		it('should NOT initialize OpenAI if API key is not set', async () => {
			// Save original env
			const originalKey = process.env.OPENAI_API_KEY;

			// Clear the API key
			delete process.env.OPENAI_API_KEY;

			const manager = new LLMManager(mockLogger, LLMProviderType.OLLAMA);

			// Try to initialize all providers
			await manager.initializeAllProviders();

			// OpenAI should not have been initialized
			expect(mockLogger.debug).toHaveBeenCalledWith(
				'OpenAI provider not configured (OPENAI_API_KEY not set) - skipping initialization',
			);

			// Restore env
			if (originalKey) {
				process.env.OPENAI_API_KEY = originalKey;
			}
		});
	});

	describe('Graceful Degradation', () => {
		it('should handle complete LLM unavailability', async () => {
			// Save original env
			const originalKey = process.env.OPENAI_API_KEY;
			const originalUrl = process.env.OLLAMA_API_URL;

			// Clear all LLM configuration
			delete process.env.OPENAI_API_KEY;
			delete process.env.OLLAMA_API_URL;

			// Mock all providers to fail
			const mockFailedProvider = {
				initialize: jest.fn().mockResolvedValue(false),
				isInitialized: jest.fn().mockReturnValue(false),
				getProviderName: jest.fn().mockReturnValue('Failed'),
				getAvailableModels: jest.fn().mockReturnValue([]),
				createCompletion: jest.fn().mockRejectedValue(new Error('Not available')),
			};

			(OllamaProvider as jest.Mock).mockImplementation(() => mockFailedProvider);
			(OpenAIProvider as jest.Mock).mockImplementation(() => mockFailedProvider);

			const manager = new LLMManager(mockLogger, LLMProviderType.OLLAMA);
			await manager.initializeAllProviders();

			// Should log that no providers are available
			expect(mockLogger.info).toHaveBeenCalledWith(
				'Provider initialization complete. Available providers:',
				'None',
			);

			// Restore env
			if (originalKey) {
				process.env.OPENAI_API_KEY = originalKey;
			}
			if (originalUrl) {
				process.env.OLLAMA_API_URL = originalUrl;
			}
		});

		it('should throw error when trying to use unavailable provider', async () => {
			// Don't initialize any providers
			await expect(
				llmManager.createCompletion({
					messages: [{ role: 'user', content: 'test' }],
					provider: LLMProviderType.OLLAMA,
				}),
			).rejects.toThrow();
		});
	});

	describe('Provider Configuration Detection', () => {
		it('should detect Ollama configuration', async () => {
			// Save original env
			const originalUrl = process.env.OLLAMA_API_URL;

			// Set Ollama URL
			process.env.OLLAMA_API_URL = 'http://localhost:11434';

			const manager = new LLMManager(mockLogger, LLMProviderType.OLLAMA);

			// Mock provider
			const mockOllamaProvider = {
				initialize: jest.fn().mockResolvedValue(true),
				isInitialized: jest.fn().mockReturnValue(true),
				getProviderName: jest.fn().mockReturnValue('Ollama'),
				getAvailableModels: jest.fn().mockReturnValue(['llama3']),
			};

			(OllamaProvider as jest.Mock).mockImplementation(() => mockOllamaProvider);

			await manager.initializeAllProviders();

			// Ollama should have been initialized
			expect(mockOllamaProvider.initialize).toHaveBeenCalled();

			// Restore env
			if (originalUrl) {
				process.env.OLLAMA_API_URL = originalUrl;
			} else {
				delete process.env.OLLAMA_API_URL;
			}
		});

		it('should detect OpenAI configuration only when API key is set', async () => {
			// Save original env
			const originalKey = process.env.OPENAI_API_KEY;

			// Set OpenAI API key
			process.env.OPENAI_API_KEY = 'test-key';

			const manager = new LLMManager(mockLogger, LLMProviderType.OLLAMA);

			// Mock provider
			const mockOpenAIProvider = {
				initialize: jest.fn().mockResolvedValue(true),
				isInitialized: jest.fn().mockReturnValue(true),
				getProviderName: jest.fn().mockReturnValue('OpenAI'),
				getAvailableModels: jest.fn().mockReturnValue(['gpt-3.5-turbo']),
			};

			(OpenAIProvider as jest.Mock).mockImplementation(() => mockOpenAIProvider);

			await manager.initializeAllProviders();

			// OpenAI should have been initialized
			expect(mockOpenAIProvider.initialize).toHaveBeenCalled();

			// Restore env
			if (originalKey) {
				process.env.OPENAI_API_KEY = originalKey;
			} else {
				delete process.env.OPENAI_API_KEY;
			}
		});
	});
});

