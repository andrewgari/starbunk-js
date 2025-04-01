import { LLMFactory, LLMProviderType, LLMProviderError } from '../llmFactory';
import { OllamaProvider } from '../providers/ollamaProvider';
import { OpenAIProvider } from '../providers/openaiProvider';
import { mockLogger } from '../../../starbunk/bots/test-utils/testUtils';
import environment from '../../../environment';

// Mock the environment
jest.mock('../../../environment', () => ({
  llm: {
    OPENAI_API_KEY: 'test-openai-key',
    OPENAI_DEFAULT_MODEL: 'test-gpt-model',
    OLLAMA_API_URL: 'http://test-ollama-url',
    OLLAMA_DEFAULT_MODEL: 'test-llama-model',
  }
}));

// Mock the providers
jest.mock('../providers/ollamaProvider');
jest.mock('../providers/openaiProvider');

describe('LLMFactory', () => {
  beforeEach(() => {
    // Clear all mocks between tests
    jest.clearAllMocks();
    
    // Reset constructor mocks
    (OpenAIProvider as jest.Mock).mockClear();
    (OllamaProvider as jest.Mock).mockClear();
  });

  describe('createProvider', () => {
    test('should create OpenAI provider', () => {
      const config = { 
        logger: mockLogger,
        apiKey: 'test-key',
        defaultModel: 'test-model'
      };
      
      const provider = LLMFactory.createProvider(LLMProviderType.OPENAI, config);
      
      expect(OpenAIProvider).toHaveBeenCalledWith(config);
      expect(provider).toBeInstanceOf(OpenAIProvider);
    });

    test('should create Ollama provider', () => {
      const config = { 
        logger: mockLogger,
        apiUrl: 'http://test-url',
        defaultModel: 'test-model'
      };
      
      const provider = LLMFactory.createProvider(LLMProviderType.OLLAMA, config);
      
      expect(OllamaProvider).toHaveBeenCalledWith(config);
      expect(provider).toBeInstanceOf(OllamaProvider);
    });

    test('should throw error for unknown provider type', () => {
      const config = { 
        logger: mockLogger,
        defaultModel: 'test-model'
      };
      
      expect(() => {
        // @ts-ignore - Testing invalid enum value
        LLMFactory.createProvider('unknown-provider', config);
      }).toThrow(LLMProviderError);
    });
  });

  describe('createProviderFromEnv', () => {
    test('should create OpenAI provider from environment variables', () => {
      const provider = LLMFactory.createProviderFromEnv(LLMProviderType.OPENAI, mockLogger);
      
      expect(OpenAIProvider).toHaveBeenCalledWith({
        logger: mockLogger,
        defaultModel: 'test-gpt-model',
        apiKey: 'test-openai-key',
      });
      expect(provider).toBeInstanceOf(OpenAIProvider);
    });

    test('should create Ollama provider from environment variables', () => {
      const provider = LLMFactory.createProviderFromEnv(LLMProviderType.OLLAMA, mockLogger);
      
      expect(OllamaProvider).toHaveBeenCalledWith({
        logger: mockLogger,
        defaultModel: 'test-llama-model',
        apiUrl: 'http://test-ollama-url',
      });
      expect(provider).toBeInstanceOf(OllamaProvider);
    });

    test('should use default values when environment variables are missing', () => {
      // Temporarily override environment mock to simulate missing values
      const originalEnv = { ...environment };
      (environment as any).llm = {
        OPENAI_API_KEY: '',
        OPENAI_DEFAULT_MODEL: '',
        OLLAMA_API_URL: '',
        OLLAMA_DEFAULT_MODEL: '',
      };
      
      const openaiProvider = LLMFactory.createProviderFromEnv(LLMProviderType.OPENAI, mockLogger);
      expect(OpenAIProvider).toHaveBeenCalledWith({
        logger: mockLogger,
        defaultModel: 'gpt-4o-mini',
        apiKey: '',
      });
      
      // Reset mock calls
      (OpenAIProvider as jest.Mock).mockClear();
      
      const ollamaProvider = LLMFactory.createProviderFromEnv(LLMProviderType.OLLAMA, mockLogger);
      expect(OllamaProvider).toHaveBeenCalledWith({
        logger: mockLogger,
        defaultModel: 'llama3:4b',
        apiUrl: 'http://localhost:11434',
      });
      
      // Restore environment
      (environment as any).llm = originalEnv.llm;
    });

    test('should throw error for unknown provider type', () => {
      expect(() => {
        // @ts-ignore - Testing invalid enum value
        LLMFactory.createProviderFromEnv('unknown-provider', mockLogger);
      }).toThrow(LLMProviderError);
    });
  });

  describe('LLMProviderError', () => {
    test('should have correct name and message', () => {
      const error = new LLMProviderError('Test error message');
      expect(error.name).toBe('LLMProviderError');
      expect(error.message).toBe('Test error message');
    });
  });
});