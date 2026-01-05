import { describe, it, expect } from '@jest/globals';
import { createMockLLMProvider, createMockLLMSetup, assertActualLLMUsed, assertEmulatorUsed } from '../index';

describe('LLM Testing Integration', () => {
	describe('createMockLLMProvider', () => {
		it('should create a ready-to-use mock provider', async () => {
			const provider = await createMockLLMProvider();

			expect(provider.isInitialized()).toBe(true);
			expect(provider.getProviderName()).toBe('mock');

			const response = await provider.createCompletion({
				messages: [{ role: 'user', content: 'Hello' }],
			});

			expect(response.content).toBe('Mock LLM response');
		});

		it('should use custom default model', async () => {
			const provider = await createMockLLMProvider(undefined, 'custom-model');

			const response = await provider.createCompletion({
				messages: [{ role: 'user', content: 'Hello' }],
			});

			expect(response.model).toBe('custom-model');
		});
	});

	describe('createMockLLMSetup', () => {
		it('should create tracker and provider together', async () => {
			const { tracker, provider } = await createMockLLMSetup();

			await provider.createCompletion({
				messages: [{ role: 'user', content: 'Hello' }],
			});

			expect(tracker.hasCalls()).toBe(true);
			expect(tracker.wasProviderUsed('mock')).toBe(true);
		});

		it('should share tracker between provider and setup', async () => {
			const { tracker, provider } = await createMockLLMSetup();

			provider.setMockResponse('Test', 'Response');

			await provider.createCompletion({
				messages: [{ role: 'user', content: 'Test' }],
			});

			const calls = tracker.getCalls();
			expect(calls).toHaveLength(1);
			expect(calls[0].response.content).toBe('Response');
		});
	});

	describe('assertActualLLMUsed', () => {
		it('should pass when actual LLM is used', async () => {
			const { tracker } = await createMockLLMSetup();

			tracker.recordCall(
				'ollama',
				'llama3',
				{ messages: [{ role: 'user', content: 'Hello' }] },
				{ content: 'Hi', model: 'llama3', provider: 'ollama' },
			);

			expect(() => assertActualLLMUsed(tracker, 'ollama')).not.toThrow();
		});

		it('should throw when no calls were made', async () => {
			const { tracker } = await createMockLLMSetup();

			expect(() => assertActualLLMUsed(tracker, 'ollama')).toThrow('No LLM calls were made');
		});

		it('should throw when wrong provider was used', async () => {
			const { tracker } = await createMockLLMSetup();

			tracker.recordCall(
				'openai',
				'gpt-4',
				{ messages: [{ role: 'user', content: 'Hello' }] },
				{ content: 'Hi', model: 'gpt-4', provider: 'openai' },
			);

			expect(() => assertActualLLMUsed(tracker, 'ollama')).toThrow("Expected provider 'ollama' but got: openai");
		});

		it('should throw when mock was used', async () => {
			const { tracker, provider } = await createMockLLMSetup();

			await provider.createCompletion({
				messages: [{ role: 'user', content: 'Hello' }],
			});

			expect(() => assertActualLLMUsed(tracker, 'ollama')).toThrow(
				"Expected actual LLM provider 'ollama' but mock was used",
			);
		});

		it('should throw when fallback was triggered', async () => {
			const { tracker } = await createMockLLMSetup();

			tracker.recordCall(
				'ollama',
				'llama3',
				{ messages: [{ role: 'user', content: 'Hello' }] },
				{ content: 'Hi', model: 'llama3', provider: 'ollama' },
				true, // isFallback
			);

			expect(() => assertActualLLMUsed(tracker, 'ollama')).toThrow('Fallback mechanism was triggered');
		});
	});

	describe('assertEmulatorUsed', () => {
		it('should pass when mock was used', async () => {
			const { tracker, provider } = await createMockLLMSetup();

			await provider.createCompletion({
				messages: [{ role: 'user', content: 'Hello' }],
			});

			expect(() => assertEmulatorUsed(tracker)).not.toThrow();
		});

		it('should pass when fallback was triggered', async () => {
			const { tracker } = await createMockLLMSetup();

			tracker.recordCall(
				'ollama',
				'llama3',
				{ messages: [{ role: 'user', content: 'Hello' }] },
				{ content: 'Hi', model: 'llama3', provider: 'ollama' },
				true, // isFallback
			);

			expect(() => assertEmulatorUsed(tracker)).not.toThrow();
		});

		it('should throw when actual LLM was used', async () => {
			const { tracker } = await createMockLLMSetup();

			tracker.recordCall(
				'ollama',
				'llama3',
				{ messages: [{ role: 'user', content: 'Hello' }] },
				{ content: 'Hi', model: 'llama3', provider: 'ollama' },
			);

			expect(() => assertEmulatorUsed(tracker)).toThrow('Expected mock/fallback but actual LLM was used');
		});

		it('should throw when no calls were made', async () => {
			const { tracker } = await createMockLLMSetup();

			expect(() => assertEmulatorUsed(tracker)).toThrow('No LLM calls were made');
		});
	});
});
