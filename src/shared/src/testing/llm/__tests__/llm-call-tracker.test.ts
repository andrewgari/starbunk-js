import { describe, it, expect, beforeEach } from '@jest/globals';
import { LLMCallTracker } from '../llm-call-tracker';
import { LLMCompletionOptions, LLMCompletionResponse } from '../../../services/llm/llm-service';

describe('LLMCallTracker', () => {
	let tracker: LLMCallTracker;

	beforeEach(() => {
		tracker = new LLMCallTracker();
	});

	describe('Basic Recording', () => {
		it('should record a successful call', () => {
			const options: LLMCompletionOptions = {
				messages: [{ role: 'user', content: 'Hello' }],
			};
			const response: LLMCompletionResponse = {
				content: 'Hi there!',
				model: 'gpt-4',
				provider: 'openai',
			};

			tracker.recordCall('openai', 'gpt-4', options, response);

			expect(tracker.hasCalls()).toBe(true);
			expect(tracker.getCalls()).toHaveLength(1);

			const call = tracker.getLastCall();
			expect(call).toBeDefined();
			expect(call?.provider).toBe('openai');
			expect(call?.model).toBe('gpt-4');
			expect(call?.response.content).toBe('Hi there!');
		});

		it('should record a failed call', () => {
			const options: LLMCompletionOptions = {
				messages: [{ role: 'user', content: 'Hello' }],
			};
			const error = new Error('API Error');

			tracker.recordFailure('openai', 'gpt-4', options, error);

			expect(tracker.hasCalls()).toBe(true);
			expect(tracker.hadFailures()).toBe(true);

			const failedCalls = tracker.getFailedCalls();
			expect(failedCalls).toHaveLength(1);
			expect(failedCalls[0].error).toBe(error);
		});

		it('should record fallback calls', () => {
			const options: LLMCompletionOptions = {
				messages: [{ role: 'user', content: 'Hello' }],
			};
			const response: LLMCompletionResponse = {
				content: 'Fallback response',
				model: 'emulator',
				provider: 'emulator',
			};

			tracker.recordCall('emulator', 'emulator', options, response, true);

			expect(tracker.hadFallbacks()).toBe(true);
			expect(tracker.getFallbackCalls()).toHaveLength(1);
		});
	});

	describe('Filtering and Querying', () => {
		beforeEach(() => {
			// Record multiple calls
			tracker.recordCall(
				'openai',
				'gpt-4',
				{ messages: [{ role: 'user', content: 'Question 1' }] },
				{ content: 'Answer 1', model: 'gpt-4', provider: 'openai' },
			);

			tracker.recordCall(
				'ollama',
				'llama3',
				{ messages: [{ role: 'user', content: 'Question 2' }] },
				{ content: 'Answer 2', model: 'llama3', provider: 'ollama' },
			);

			tracker.recordCall(
				'openai',
				'gpt-3.5-turbo',
				{ messages: [{ role: 'user', content: 'Question 3' }] },
				{ content: 'Answer 3', model: 'gpt-3.5-turbo', provider: 'openai' },
			);
		});

		it('should filter calls by provider', () => {
			const openaiCalls = tracker.getCallsByProvider('openai');
			expect(openaiCalls).toHaveLength(2);

			const ollamaCalls = tracker.getCallsByProvider('ollama');
			expect(ollamaCalls).toHaveLength(1);
		});

		it('should filter calls by model', () => {
			const gpt4Calls = tracker.getCallsByModel('gpt-4');
			expect(gpt4Calls).toHaveLength(1);

			const llama3Calls = tracker.getCallsByModel('llama3');
			expect(llama3Calls).toHaveLength(1);
		});

		it('should check if provider was used', () => {
			expect(tracker.wasProviderUsed('openai')).toBe(true);
			expect(tracker.wasProviderUsed('ollama')).toBe(true);
			expect(tracker.wasProviderUsed('anthropic')).toBe(false);
		});

		it('should check if model was used', () => {
			expect(tracker.wasModelUsed('gpt-4')).toBe(true);
			expect(tracker.wasModelUsed('llama3')).toBe(true);
			expect(tracker.wasModelUsed('claude-3')).toBe(false);
		});

		it('should find calls by prompt text', () => {
			const calls = tracker.getCallsWithPromptText('Question 2');
			expect(calls).toHaveLength(1);
			expect(calls[0].provider).toBe('ollama');
		});

		it('should find calls by response text', () => {
			const calls = tracker.getCallsWithResponseText('Answer 3');
			expect(calls).toHaveLength(1);
			expect(calls[0].model).toBe('gpt-3.5-turbo');
		});
	});

	describe('Statistics', () => {
		beforeEach(() => {
			// Record various calls
			tracker.recordCall(
				'openai',
				'gpt-4',
				{ messages: [{ role: 'user', content: 'Q1' }] },
				{ content: 'A1', model: 'gpt-4', provider: 'openai' },
			);

			tracker.recordCall(
				'openai',
				'gpt-4',
				{ messages: [{ role: 'user', content: 'Q2' }] },
				{ content: 'A2', model: 'gpt-4', provider: 'openai' },
			);

			tracker.recordCall(
				'ollama',
				'llama3',
				{ messages: [{ role: 'user', content: 'Q3' }] },
				{ content: 'A3', model: 'llama3', provider: 'ollama' },
			);

			tracker.recordCall(
				'emulator',
				'emulator',
				{ messages: [{ role: 'user', content: 'Q4' }] },
				{ content: 'A4', model: 'emulator', provider: 'emulator' },
				true, // fallback
			);

			tracker.recordFailure(
				'openai',
				'gpt-4',
				{ messages: [{ role: 'user', content: 'Q5' }] },
				new Error('Failed'),
			);
		});

		it('should calculate correct statistics', () => {
			const stats = tracker.getStats();

			expect(stats.total).toBe(5);
			expect(stats.byProvider['openai']).toBe(3); // 2 successful + 1 failed
			expect(stats.byProvider['ollama']).toBe(1);
			expect(stats.byProvider['emulator']).toBe(1);
			expect(stats.byModel['gpt-4']).toBe(3);
			expect(stats.byModel['llama3']).toBe(1);
			expect(stats.fallbacks).toBe(1);
			expect(stats.failures).toBe(1);
		});
	});

	describe('Control Methods', () => {
		it('should clear all calls', () => {
			tracker.recordCall(
				'openai',
				'gpt-4',
				{ messages: [{ role: 'user', content: 'Hello' }] },
				{ content: 'Hi', model: 'gpt-4', provider: 'openai' },
			);

			expect(tracker.hasCalls()).toBe(true);

			tracker.clear();

			expect(tracker.hasCalls()).toBe(false);
			expect(tracker.getCalls()).toHaveLength(0);
		});

		it('should enable and disable tracking', () => {
			expect(tracker.isEnabled()).toBe(true);

			tracker.disable();
			expect(tracker.isEnabled()).toBe(false);

			// Recording should not work when disabled
			tracker.recordCall(
				'openai',
				'gpt-4',
				{ messages: [{ role: 'user', content: 'Hello' }] },
				{ content: 'Hi', model: 'gpt-4', provider: 'openai' },
			);

			expect(tracker.hasCalls()).toBe(false);

			tracker.enable();
			expect(tracker.isEnabled()).toBe(true);

			// Recording should work again
			tracker.recordCall(
				'openai',
				'gpt-4',
				{ messages: [{ role: 'user', content: 'Hello' }] },
				{ content: 'Hi', model: 'gpt-4', provider: 'openai' },
			);

			expect(tracker.hasCalls()).toBe(true);
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty tracker', () => {
			expect(tracker.hasCalls()).toBe(false);
			expect(tracker.getLastCall()).toBeUndefined();
			expect(tracker.getCalls()).toHaveLength(0);
			expect(tracker.hadFallbacks()).toBe(false);
			expect(tracker.hadFailures()).toBe(false);
		});

		it('should handle multiple messages in options', () => {
			const options: LLMCompletionOptions = {
				messages: [
					{ role: 'system', content: 'You are helpful' },
					{ role: 'user', content: 'Hello' },
					{ role: 'assistant', content: 'Hi' },
					{ role: 'user', content: 'How are you?' },
				],
			};

			tracker.recordCall('openai', 'gpt-4', options, {
				content: 'I am good',
				model: 'gpt-4',
				provider: 'openai',
			});

			const calls = tracker.getCallsWithPromptText('How are you?');
			expect(calls).toHaveLength(1);
		});

		it('should generate unique IDs for each call', () => {
			tracker.recordCall(
				'openai',
				'gpt-4',
				{ messages: [{ role: 'user', content: 'Q1' }] },
				{ content: 'A1', model: 'gpt-4', provider: 'openai' },
			);

			tracker.recordCall(
				'openai',
				'gpt-4',
				{ messages: [{ role: 'user', content: 'Q2' }] },
				{ content: 'A2', model: 'gpt-4', provider: 'openai' },
			);

			const calls = tracker.getCalls();
			expect(calls[0].id).not.toBe(calls[1].id);
		});
	});
});
