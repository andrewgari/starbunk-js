import { LLMCompletionOptions, LLMCompletionResponse } from '../../services/llm/llmService';

/**
 * Represents a single LLM call record
 */
export interface LLMCallRecord {
	/** Unique identifier for this call */
	id: string;
	/** Timestamp when the call was made */
	timestamp: number;
	/** Provider that handled the call (e.g., 'openai', 'ollama', 'mock') */
	provider: string;
	/** Model used for the completion */
	model: string;
	/** The completion options used */
	options: LLMCompletionOptions;
	/** The response received */
	response: LLMCompletionResponse;
	/** Whether this was a fallback call */
	isFallback: boolean;
	/** Error if the call failed */
	error?: Error;
}

/**
 * Statistics about LLM calls
 */
export interface LLMCallStats {
	/** Total number of calls */
	total: number;
	/** Calls by provider */
	byProvider: Record<string, number>;
	/** Calls by model */
	byModel: Record<string, number>;
	/** Number of fallback calls */
	fallbacks: number;
	/** Number of failed calls */
	failures: number;
}

/**
 * Tracks LLM calls for testing and verification
 *
 * This class provides a way to spy on LLM calls during tests,
 * allowing verification of:
 * - Which provider was actually used
 * - What prompts were sent
 * - What responses were received
 * - Whether fallback mechanisms were triggered
 */
export class LLMCallTracker {
	private calls: LLMCallRecord[] = [];
	private enabled: boolean = true;

	/**
	 * Record an LLM call
	 */
	recordCall(
		provider: string,
		model: string,
		options: LLMCompletionOptions,
		response: LLMCompletionResponse,
		isFallback: boolean = false,
	): void {
		if (!this.enabled) return;

		const record: LLMCallRecord = {
			id: `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
			timestamp: Date.now(),
			provider,
			model,
			options,
			response,
			isFallback,
		};

		this.calls.push(record);
	}

	/**
	 * Record a failed LLM call
	 */
	recordFailure(
		provider: string,
		model: string,
		options: LLMCompletionOptions,
		error: Error,
		isFallback: boolean = false,
	): void {
		if (!this.enabled) return;

		const record: LLMCallRecord = {
			id: `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
			timestamp: Date.now(),
			provider,
			model,
			options,
			response: { content: '', model, provider },
			isFallback,
			error,
		};

		this.calls.push(record);
	}

	/**
	 * Get all recorded calls
	 */
	getCalls(): LLMCallRecord[] {
		return [...this.calls];
	}

	/**
	 * Get calls filtered by provider
	 */
	getCallsByProvider(provider: string): LLMCallRecord[] {
		return this.calls.filter((call) => call.provider === provider);
	}

	/**
	 * Get calls filtered by model
	 */
	getCallsByModel(model: string): LLMCallRecord[] {
		return this.calls.filter((call) => call.model === model);
	}

	/**
	 * Get only fallback calls
	 */
	getFallbackCalls(): LLMCallRecord[] {
		return this.calls.filter((call) => call.isFallback);
	}

	/**
	 * Get only failed calls
	 */
	getFailedCalls(): LLMCallRecord[] {
		return this.calls.filter((call) => call.error !== undefined);
	}

	/**
	 * Get statistics about recorded calls
	 */
	getStats(): LLMCallStats {
		const stats: LLMCallStats = {
			total: this.calls.length,
			byProvider: {},
			byModel: {},
			fallbacks: 0,
			failures: 0,
		};

		for (const call of this.calls) {
			// Count by provider
			stats.byProvider[call.provider] = (stats.byProvider[call.provider] || 0) + 1;

			// Count by model
			stats.byModel[call.model] = (stats.byModel[call.model] || 0) + 1;

			// Count fallbacks
			if (call.isFallback) {
				stats.fallbacks++;
			}

			// Count failures
			if (call.error) {
				stats.failures++;
			}
		}

		return stats;
	}

	/**
	 * Clear all recorded calls
	 */
	clear(): void {
		this.calls = [];
	}

	/**
	 * Enable call tracking
	 */
	enable(): void {
		this.enabled = true;
	}

	/**
	 * Disable call tracking
	 */
	disable(): void {
		this.enabled = false;
	}

	/**
	 * Check if tracking is enabled
	 */
	isEnabled(): boolean {
		return this.enabled;
	}

	/**
	 * Get the most recent call
	 */
	getLastCall(): LLMCallRecord | undefined {
		return this.calls[this.calls.length - 1];
	}

	/**
	 * Check if any calls were made
	 */
	hasCalls(): boolean {
		return this.calls.length > 0;
	}

	/**
	 * Check if a specific provider was used
	 */
	wasProviderUsed(provider: string): boolean {
		return this.calls.some((call) => call.provider === provider);
	}

	/**
	 * Check if a specific model was used
	 */
	wasModelUsed(model: string): boolean {
		return this.calls.some((call) => call.model === model);
	}

	/**
	 * Check if any fallbacks occurred
	 */
	hadFallbacks(): boolean {
		return this.calls.some((call) => call.isFallback);
	}

	/**
	 * Check if any failures occurred
	 */
	hadFailures(): boolean {
		return this.calls.some((call) => call.error !== undefined);
	}

	/**
	 * Get calls containing specific text in the prompt
	 */
	getCallsWithPromptText(text: string): LLMCallRecord[] {
		return this.calls.filter((call) => call.options.messages.some((msg) => msg.content.includes(text)));
	}

	/**
	 * Get calls containing specific text in the response
	 */
	getCallsWithResponseText(text: string): LLMCallRecord[] {
		return this.calls.filter((call) => call.response.content.includes(text));
	}
}
