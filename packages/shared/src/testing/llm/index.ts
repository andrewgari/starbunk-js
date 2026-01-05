/**
 * LLM Testing Utilities
 *
 * This module provides testing infrastructure for LLM interactions:
 * - LLMCallTracker: Track and verify actual LLM calls (typically Ollama)
 * - MockLLMProvider: Mock LLM provider for unit testing (when you don't want real LLM calls)
 *
 * @example Tracking real Ollama calls in E2E tests
 * ```typescript
 * import { LLMCallTracker, assertLLMCalled } from '@starbunk/shared';
 *
 * // Create a tracker
 * const tracker = new LLMCallTracker();
 *
 * // Inject tracker into your LLM manager to track real calls
 * // ... your code that makes actual Ollama calls ...
 *
 * // Verify that Ollama was actually called
 * assertLLMCalled(tracker, 'ollama');
 * expect(tracker.getCallCount()).toBeGreaterThan(0);
 * ```
 *
 * @example Using mock provider for unit tests
 * ```typescript
 * import { createMockLLMProvider } from '@starbunk/shared';
 *
 * // Create a mock provider (for unit tests where you don't want real LLM calls)
 * const { tracker, provider } = await createMockLLMSetup();
 *
 * // Configure mock responses
 * provider.setMockResponse('Hello', 'Hi there!');
 *
 * // Use the provider in tests
 * const response = await provider.createCompletion({
 *   messages: [{ role: 'user', content: 'Hello' }]
 * });
 *
 * // Verify calls
 * expect(tracker.hasCalls()).toBe(true);
 * ```
 */

export { LLMCallTracker } from './LLMCallTracker';
export type { LLMCallRecord, LLMCallStats } from './LLMCallTracker';
export { MockLLMProvider } from './MockLLMProvider';
export type { MockResponseConfig } from './MockLLMProvider';

import { LLMCallTracker } from './LLMCallTracker';
import { MockLLMProvider } from './MockLLMProvider';
import { Logger } from '../../services/logger';

/**
 * Create a mock LLM provider with a tracker
 *
 * @param tracker Optional existing tracker to use
 * @param defaultModel Optional default model name
 * @returns A configured MockLLMProvider instance
 */
export async function createMockLLMProvider(
	tracker?: LLMCallTracker,
	defaultModel: string = 'mock-gpt-4',
): Promise<MockLLMProvider> {
	const callTracker = tracker || new LLMCallTracker();
	const logger = new Logger();
	logger.setServiceName('MockLLMProvider');

	const provider = new MockLLMProvider(
		{
			defaultModel,
			logger,
		},
		callTracker,
	);

	// Initialize the provider
	await provider.initialize();

	return provider;
}

/**
 * Create a tracker and mock provider together
 *
 * @param defaultModel Optional default model name
 * @returns An object with both tracker and provider
 */
export async function createMockLLMSetup(defaultModel: string = 'mock-gpt-4'): Promise<{
	tracker: LLMCallTracker;
	provider: MockLLMProvider;
}> {
	const tracker = new LLMCallTracker();
	const provider = await createMockLLMProvider(tracker, defaultModel);

	return { tracker, provider };
}

/**
 * Helper to verify that the LLM was actually called (not mocked)
 *
 * @param tracker The call tracker to check
 * @param expectedProvider The expected provider name (typically 'ollama')
 * @throws Error if no calls were made, mock was used, or wrong provider was used
 */
export function assertLLMCalled(tracker: LLMCallTracker, expectedProvider: string = 'ollama'): void {
	if (!tracker.hasCalls()) {
		throw new Error('No LLM calls were made');
	}

	const calls = tracker.getCalls();
	const actualProviders = new Set(calls.map((call) => call.provider));

	// Check if mock was used (mock means no actual LLM call)
	if (actualProviders.has('mock')) {
		throw new Error(`Expected actual LLM provider '${expectedProvider}' but mock was used`);
	}

	// Verify the expected provider was used
	if (!tracker.wasProviderUsed(expectedProvider)) {
		throw new Error(`Expected provider '${expectedProvider}' but got: ${Array.from(actualProviders).join(', ')}`);
	}

	// Check if fallback was triggered (indicates primary LLM failed)
	if (tracker.hadFallbacks()) {
		throw new Error('Fallback mechanism was triggered, expected direct LLM usage');
	}
}

/**
 * Helper to verify that fallback was used (when primary LLM fails)
 *
 * @param tracker The call tracker to check
 * @throws Error if no fallback was triggered
 */
export function assertFallbackUsed(tracker: LLMCallTracker): void {
	if (!tracker.hasCalls()) {
		throw new Error('No LLM calls were made');
	}

	if (!tracker.hadFallbacks()) {
		throw new Error('Expected fallback to be triggered but it was not');
	}
}

// Legacy aliases for backward compatibility
export const assertActualLLMUsed = assertLLMCalled;
export function assertEmulatorUsed(tracker: LLMCallTracker): void {
	// In your setup, there's no "emulator" - just mock or actual Ollama
	// This function now checks for mock usage or fallback
	if (!tracker.hasCalls()) {
		throw new Error('No LLM calls were made');
	}

	const calls = tracker.getCalls();
	const hasMock = calls.some((call) => call.provider === 'mock');
	const hasFallback = calls.some((call) => call.isFallback);

	if (!hasMock && !hasFallback) {
		const providers = calls.map((call) => call.provider).join(', ');
		throw new Error(`Expected mock/fallback but actual LLM was used: ${providers}`);
	}
}
