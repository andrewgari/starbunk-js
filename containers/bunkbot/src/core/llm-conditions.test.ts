import { getLLMManager, LLMManager, logger } from '@starbunk/shared';
import { mockMessage } from '../test-utils/testUtils';
import { createLLMCondition } from './llm-conditions';

// Mock the shared package
jest.mock('@starbunk/shared', () => {
	const actual = jest.requireActual('@starbunk/shared');
	return {
		...actual,
		getLLMManager: jest.fn(),
		logger: {
			warn: jest.fn(),
			error: jest.fn(),
			info: jest.fn(),
			debug: jest.fn()
		}
	};
});

describe('llm-conditions', () => {
	let mockLLMManager: jest.Mocked<LLMManager>;

	beforeEach(() => {
		// Clear all mocks
		jest.clearAllMocks();

		// Create a mock LLMManager
		mockLLMManager = {
			createPromptCompletion: jest.fn(),
		} as unknown as jest.Mocked<LLMManager>;

		// Set up the getLLMManager mock to return our mock instance
		(getLLMManager as jest.Mock).mockReturnValue(mockLLMManager);
	});

	describe('createLLMCondition', () => {
		it('should use LLM for condition check when prompt type is registered', async () => {
			// Setup
			const prompt = 'Does this message mention cats?';
			const message = mockMessage({ content: 'I love cats!' });

			// Create a spy on the mock function
			const createPromptCompletionSpy = jest.fn().mockResolvedValue('yes');
			mockLLMManager.createPromptCompletion = createPromptCompletionSpy;

			// Test the mock directly first
			const directResult = await mockLLMManager.createPromptCompletion('conditionCheck', 'test', {});
			expect(directResult).toBe('yes');
			expect(createPromptCompletionSpy).toHaveBeenCalled();

			// Reset the spy
			createPromptCompletionSpy.mockClear();

			// Create condition
			const condition = createLLMCondition(prompt, {
				llmManager: mockLLMManager
			});

			// Test
			const result = await condition(message);

			// Verify
			expect(createPromptCompletionSpy).toHaveBeenCalled();
			expect(result).toBe(true);
			expect(createPromptCompletionSpy).toHaveBeenCalledWith(
				'conditionCheck',
				`${prompt} Message: "I love cats!"`,
				expect.any(Object)
			);
		});

		it('should fall back to regex when LLM fails', async () => {
			// Setup
			const prompt = 'Does this message mention cats?';
			const message = mockMessage({ content: 'I love cats!' });
			const regexFallback = /cats/i;

			mockLLMManager.createPromptCompletion.mockRejectedValue(
				new Error('Prompt type conditionCheck not registered')
			);

			// Create condition
			const condition = createLLMCondition(prompt, {
				llmManager: mockLLMManager,
				regexFallback
			});

			// Test
			const result = await condition(message);

			// Verify
			expect(result).toBe(true);
			expect(mockLLMManager.createPromptCompletion).toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('LLM condition failed, using regex fallback')
			);
		});

		it('should return false when LLM fails and no regex fallback is provided', async () => {
			// Setup
			const prompt = 'Does this message mention cats?';
			const message = mockMessage({ content: 'I love cats!' });

			mockLLMManager.createPromptCompletion.mockRejectedValue(
				new Error('Prompt type conditionCheck not registered')
			);

			// Create condition
			const condition = createLLMCondition(prompt, {
				llmManager: mockLLMManager
			});

			// Test
			const result = await condition(message);

			// Verify
			expect(result).toBe(false);
			expect(mockLLMManager.createPromptCompletion).toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('LLM condition failed')
			);
		});

		it('should use regex fallback correctly when provided', async () => {
			// Setup
			const prompt = 'Does this message mention cats?';
			const message = mockMessage({ content: 'I love dogs!' });
			const regexFallback = /cats/i;

			mockLLMManager.createPromptCompletion.mockRejectedValue(
				new Error('LLM error')
			);

			// Create condition
			const condition = createLLMCondition(prompt, {
				llmManager: mockLLMManager,
				regexFallback
			});

			// Test
			const result = await condition(message);

			// Verify
			expect(result).toBe(false); // Should be false because 'dogs' doesn't match /cats/i
			expect(mockLLMManager.createPromptCompletion).toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('LLM condition failed, using regex fallback')
			);
		});
	});
});
