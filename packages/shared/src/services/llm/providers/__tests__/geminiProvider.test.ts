import { GeminiProvider } from '../geminiProvider';
import { Logger } from '../../../logger';

describe('GeminiProvider', () => {
	let provider: GeminiProvider;
	let mockLogger: Logger;

	beforeEach(() => {
		mockLogger = {
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		} as unknown as Logger;
	});

	describe('initialization', () => {
		it('should fail to initialize without API key', async () => {
			provider = new GeminiProvider({
				logger: mockLogger,
				defaultModel: 'gemini-2.0-flash-exp',
			});

			const result = await provider.initialize();
			expect(result).toBe(false);
			expect(mockLogger.error).toHaveBeenCalledWith(
				'Error initializing Gemini provider',
				expect.any(Error),
			);
		});

		it('should initialize successfully with API key', async () => {
			provider = new GeminiProvider({
				logger: mockLogger,
				defaultModel: 'gemini-2.0-flash-exp',
				apiKey: 'test-api-key',
			});

			const result = await provider.initialize();
			expect(result).toBe(true);
			expect(mockLogger.debug).toHaveBeenCalledWith(
				expect.stringContaining('Gemini client initialized successfully'),
			);
		});
	});

	describe('provider info', () => {
		beforeEach(async () => {
			provider = new GeminiProvider({
				logger: mockLogger,
				defaultModel: 'gemini-2.0-flash-exp',
				apiKey: 'test-api-key',
			});
			await provider.initialize();
		});

		it('should return correct provider name', () => {
			expect(provider.getProviderName()).toBe('Gemini');
		});

		it('should return available models', () => {
			const models = provider.getAvailableModels();
			expect(models).toContain('gemini-2.0-flash-exp');
			expect(models).toContain('gemini-1.5-flash');
			expect(models).toContain('gemini-1.5-pro');
		});
	});
});

