import { describe, it, expect, beforeEach } from '@jest/globals';
import { MockLLMProvider } from '../MockLLMProvider';
import { LLMCallTracker } from '../LLMCallTracker';
import { Logger } from '../../../services/logger';

describe('MockLLMProvider', () => {
	let tracker: LLMCallTracker;
	let provider: MockLLMProvider;

	beforeEach(async () => {
		tracker = new LLMCallTracker();
		const logger = new Logger();
		logger.setServiceName('MockLLMProvider');
		provider = new MockLLMProvider(
			{
				defaultModel: 'mock-gpt-4',
				logger,
			},
			tracker,
		);
		await provider.initialize();
	});

	describe('Initialization', () => {
		it('should initialize successfully', () => {
			expect(provider.isInitialized()).toBe(true);
			expect(provider.getProviderName()).toBe('mock');
		});

		it('should have available models', () => {
			const models = provider.getAvailableModels();
			expect(models).toContain('mock-model-1');
			expect(models).toContain('mock-model-2');
			expect(models).toContain('mock-gpt-4');
		});
	});

	describe('Basic Completion', () => {
		it('should create a completion with default response', async () => {
			const response = await provider.createCompletion({
				messages: [{ role: 'user', content: 'Hello' }],
			});

			expect(response.content).toBe('Mock LLM response');
			expect(response.provider).toBe('mock');
			expect(response.model).toBe('mock-gpt-4');
		});

		it('should record calls in tracker', async () => {
			await provider.createCompletion({
				messages: [{ role: 'user', content: 'Hello' }],
			});

			expect(tracker.hasCalls()).toBe(true);
			expect(tracker.wasProviderUsed('mock')).toBe(true);
			expect(provider.getCallCount()).toBe(1);
		});

		it('should use custom model if specified', async () => {
			const response = await provider.createCompletion({
				model: 'mock-model-1',
				messages: [{ role: 'user', content: 'Hello' }],
			});

			expect(response.model).toBe('mock-model-1');
		});
	});

	describe('Mock Responses', () => {
		it('should return configured mock response', async () => {
			provider.setMockResponse('What is 2+2?', 'The answer is 4');

			const response = await provider.createCompletion({
				messages: [{ role: 'user', content: 'What is 2+2?' }],
			});

			expect(response.content).toBe('The answer is 4');
		});

		it('should support mock response config object', async () => {
			provider.setMockResponse('Hello', {
				content: 'Hi there!',
				delay: 10,
			});

			const startTime = Date.now();
			const response = await provider.createCompletion({
				messages: [{ role: 'user', content: 'Hello' }],
			});
			const duration = Date.now() - startTime;

			expect(response.content).toBe('Hi there!');
			expect(duration).toBeGreaterThanOrEqual(10);
		});

		it('should simulate errors when configured', async () => {
			provider.setMockResponse('Fail', {
				content: '',
				shouldError: true,
				errorMessage: 'Simulated error',
			});

			await expect(
				provider.createCompletion({
					messages: [{ role: 'user', content: 'Fail' }],
				}),
			).rejects.toThrow('Simulated error');

			expect(tracker.hadFailures()).toBe(true);
		});

		it('should use default response for unmatched prompts', async () => {
			provider.setDefaultResponse('Custom default');

			const response = await provider.createCompletion({
				messages: [{ role: 'user', content: 'Unmatched prompt' }],
			});

			expect(response.content).toBe('Custom default');
		});

		it('should clear mock responses', async () => {
			provider.setMockResponse('Hello', 'Hi');
			provider.clearMockResponses();

			const response = await provider.createCompletion({
				messages: [{ role: 'user', content: 'Hello' }],
			});

			expect(response.content).toBe('Mock LLM response'); // default
		});
	});

	describe('Call Tracking', () => {
		it('should track multiple calls', async () => {
			await provider.createCompletion({
				messages: [{ role: 'user', content: 'Q1' }],
			});

			await provider.createCompletion({
				messages: [{ role: 'user', content: 'Q2' }],
			});

			await provider.createCompletion({
				messages: [{ role: 'user', content: 'Q3' }],
			});

			expect(provider.getCallCount()).toBe(3);
			expect(tracker.getCalls()).toHaveLength(3);
		});

		it('should reset call count', async () => {
			await provider.createCompletion({
				messages: [{ role: 'user', content: 'Hello' }],
			});

			expect(provider.getCallCount()).toBe(1);

			provider.resetCallCount();

			expect(provider.getCallCount()).toBe(0);
			// Tracker should still have the call
			expect(tracker.hasCalls()).toBe(true);
		});
	});

	describe('Reset', () => {
		it('should reset provider to initial state', async () => {
			provider.setMockResponse('Hello', 'Hi');
			provider.setDefaultResponse('Custom');

			await provider.createCompletion({
				messages: [{ role: 'user', content: 'Test' }],
			});

			provider.reset();

			expect(provider.getCallCount()).toBe(0);

			const response = await provider.createCompletion({
				messages: [{ role: 'user', content: 'Hello' }],
			});

			expect(response.content).toBe('Mock LLM response'); // back to default
		});
	});
});

