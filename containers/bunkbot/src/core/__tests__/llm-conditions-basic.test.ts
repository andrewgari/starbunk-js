import { LLMManager } from '@starbunk/shared';
import { PromptType } from '@starbunk/shared';
import { logger } from '@starbunk/shared';
import { mockMessage } from '../../test-utils/testUtils';
import { createLLMCondition } from '../llm-conditions';

// Mock the dependencies
jest.mock('@starbunk/shared');
jest.mock('@starbunk/shared');

// Do not attempt to mock bootstrap, which is causing issues
// The key is that we're providing the LLMManager directly when testing

describe('LLM Conditions', () => {
	// Create a mock LLM manager for direct use
	const mockLLMManager = {
		createPromptCompletion: jest.fn()
	} as unknown as jest.Mocked<LLMManager>;

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('createLLMCondition', () => {
		it('should return true when LLM responds with "yes"', async () => {
			// Setup
			const prompt = 'Does this message mention cats?';
			const message = mockMessage('I love cats!');
			mockLLMManager.createPromptCompletion.mockResolvedValue('yes');

			// Create the condition with the mock manager explicitly provided
			const condition = createLLMCondition(prompt, {
				llmManager: mockLLMManager
			});

			// Execute
			const result = await condition(message);

			// Verify
			expect(result).toBe(true);
			expect(mockLLMManager.createPromptCompletion).toHaveBeenCalledWith(
				PromptType.CONDITION_CHECK,
				`${prompt} Message: "I love cats!"`,
				expect.any(Object)
			);
		});

		it('should return false when LLM responds with "no"', async () => {
			// Setup
			const prompt = 'Does this message mention cats?';
			const message = mockMessage('I love dogs!');
			mockLLMManager.createPromptCompletion.mockResolvedValue('no');

			// Create the condition with the mock manager
			const condition = createLLMCondition(prompt, {
				llmManager: mockLLMManager
			});

			// Execute
			const result = await condition(message);

			// Verify
			expect(result).toBe(false);
		});

		it('should use regex fallback when LLM fails', async () => {
			// Setup
			const prompt = 'Does this message mention cats?';
			const message = mockMessage('I love cats!');
			const regexFallback = /cats/i;

			// Make the LLM call fail
			mockLLMManager.createPromptCompletion.mockRejectedValue(new Error('LLM unavailable'));

			// Create condition with fallback
			const condition = createLLMCondition(prompt, {
				llmManager: mockLLMManager,
				regexFallback
			});

			// Execute
			const result = await condition(message);

			// Verify - should use the fallback and match
			expect(result).toBe(true);
			expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('LLM condition failed'));
		});

		it('should return false when LLM fails and regex does not match', async () => {
			// Setup
			const prompt = 'Does this message mention cats?';
			const message = mockMessage('I love dogs!');
			const regexFallback = /cats/i;

			// Make the LLM call fail
			mockLLMManager.createPromptCompletion.mockRejectedValue(new Error('LLM unavailable'));

			// Create condition with fallback
			const condition = createLLMCondition(prompt, {
				llmManager: mockLLMManager,
				regexFallback
			});

			// Execute
			const result = await condition(message);

			// Verify - should use the fallback but not match
			expect(result).toBe(false);
		});

		it('should return false when LLM fails and no fallback is provided', async () => {
			// Setup
			const prompt = 'Does this message mention cats?';
			const message = mockMessage('I love cats!');

			// Make the LLM call fail
			mockLLMManager.createPromptCompletion.mockRejectedValue(new Error('LLM unavailable'));

			// Create condition without fallback
			const condition = createLLMCondition(prompt, {
				llmManager: mockLLMManager
			});

			// Execute
			const result = await condition(message);

			// Verify - should fail
			expect(result).toBe(false);
			expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('LLM condition failed'));
		});
	});

	// Skip testing isLLMAvailable since it depends on bootstrap
});
