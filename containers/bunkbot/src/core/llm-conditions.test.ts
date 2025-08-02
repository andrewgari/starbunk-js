import { LLMManager } from '@starbunk/shared';
import { PromptType } from '@starbunk/shared';
import { logger } from '@starbunk/shared';
import { mockMessage } from '../test-utils/testUtils';
import { createLLMCondition } from './llm-conditions';

// Mock the LLMManager
jest.mock('@starbunk/shared');
jest.mock('@starbunk/shared');

describe('llm-conditions', () => {
	let mockLLMManager: jest.Mocked<LLMManager>;

	beforeEach(() => {
		// Clear all mocks
		jest.clearAllMocks();

		// Create a mock LLMManager
		mockLLMManager = {
			createPromptCompletion: jest.fn(),
		} as unknown as jest.Mocked<LLMManager>;
	});

	describe('createLLMCondition', () => {
		it('should use LLM for condition check when prompt type is registered', async () => {
			// Setup
			const prompt = 'Does this message mention cats?';
			const message = mockMessage({ content: 'I love cats!' });
			mockLLMManager.createPromptCompletion.mockResolvedValue('yes');

			// Create condition
			const condition = createLLMCondition(prompt, {
				llmManager: mockLLMManager
			});

			// Test
			const result = await condition(message);

			// Verify
			expect(result).toBe(true);
			expect(mockLLMManager.createPromptCompletion).toHaveBeenCalledWith(
				PromptType.CONDITION_CHECK,
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
