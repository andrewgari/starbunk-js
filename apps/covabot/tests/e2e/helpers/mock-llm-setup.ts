/**
 * Mock LLM Setup for E2E Tests
 *
 * This helper creates a mock LLM manager that returns predictable responses
 * for testing different scenarios without depending on external LLM services.
 */

import { LLMCallTracker, MockLLMProvider, logger } from '@starbunk/shared';
import { LLMManager } from '@starbunk/shared/dist/services/llm/llmManager';
import { LLMProviderType } from '@starbunk/shared/dist/services/llm/llmFactory';

/**
 * Response scenarios for testing
 */
export enum ResponseScenario {
	/** LLM decides not to respond (returns empty string) */
	NO_RESPONSE = 'NO_RESPONSE',
	/** LLM responds with a good message */
	GOOD_RESPONSE = 'GOOD_RESPONSE',
	/** LLM responds but with a poor/unexpected response */
	BAD_RESPONSE = 'BAD_RESPONSE',
	/** LLM encounters an error */
	ERROR = 'ERROR',
}

/**
 * Create a mock LLM manager for E2E testing
 *
 * @param tracker - LLM call tracker to record calls
 * @param scenario - The response scenario to simulate
 * @returns Configured LLM manager with mock provider
 */
export async function createMockLLMManagerForE2E(
	tracker: LLMCallTracker,
	scenario: ResponseScenario = ResponseScenario.GOOD_RESPONSE,
): Promise<LLMManager> {
	// Create mock provider
	const mockProvider = new MockLLMProvider(
		{
			defaultModel: 'mock-gpt-4',
			logger,
		},
		tracker,
	);

	await mockProvider.initialize();

	// Configure responses based on scenario
	if (scenario === ResponseScenario.NO_RESPONSE) {
		// LLM decides not to respond - return empty string
		mockProvider.setDefaultResponse('');
	} else if (scenario === ResponseScenario.GOOD_RESPONSE) {
		// LLM responds with a good message
		mockProvider.setDefaultResponse('Hey! How can I help you?');
	} else if (scenario === ResponseScenario.BAD_RESPONSE) {
		// LLM responds but with unexpected content
		mockProvider.setDefaultResponse('SYSTEM ERROR: INVALID RESPONSE FORMAT');
	} else if (scenario === ResponseScenario.ERROR) {
		// LLM encounters an error
		mockProvider.setDefaultResponse('');
		// We'll configure specific prompts to error in the tests
	}

	// Create LLM manager and register the mock provider
	const llmManager = new LLMManager(logger, LLMProviderType.OPENAI, tracker);

	// Replace the provider with our mock
	// @ts-expect-error - Accessing private property for testing
	llmManager.providers.set(LLMProviderType.OPENAI, mockProvider);
	// @ts-expect-error - Accessing private property for testing
	llmManager.providers.set(LLMProviderType.OLLAMA, mockProvider);

	return llmManager;
}

/**
 * Configure specific mock responses for different message patterns
 *
 * @param mockProvider - The mock provider to configure
 */
export function configureMockResponses(mockProvider: MockLLMProvider): void {
	// Direct mentions should get a response
	mockProvider.setMockResponse(
		'@CovaBot hello',
		'Hey! How can I help you?',
	);

	// Questions should get a response
	mockProvider.setMockResponse(
		'CovaBot, what time is it?',
		"I don't have access to the current time, but I'm here to help!",
	);

	// Casual conversation might not get a response
	mockProvider.setMockResponse(
		'just chatting with friends',
		'', // No response
	);

	// Error scenario
	mockProvider.setMockResponse(
		'trigger error',
		{
			content: '',
			shouldError: true,
			errorMessage: 'Mock LLM error for testing',
		},
	);
}

