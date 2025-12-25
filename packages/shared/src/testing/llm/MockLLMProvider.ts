import { BaseLLMProvider } from '../../services/llm/baseLlmProvider';
import {
	LLMCompletionOptions,
	LLMCompletionResponse,
	LLMServiceConfig,
} from '../../services/llm/llmService';
import { LLMCallTracker } from './LLMCallTracker';

/**
 * Configuration for mock responses
 */
export interface MockResponseConfig {
	/** The response content to return */
	content: string;
	/** Optional delay in milliseconds before responding */
	delay?: number;
	/** Whether to simulate an error */
	shouldError?: boolean;
	/** Error message if shouldError is true */
	errorMessage?: string;
}

/**
 * Mock LLM provider for testing
 *
 * This provider integrates with LLMCallTracker to record all calls
 * and allows configuring mock responses for testing.
 */
export class MockLLMProvider extends BaseLLMProvider {
	private tracker: LLMCallTracker;
	private mockResponses: Map<string, MockResponseConfig> = new Map();
	private defaultResponse: string = 'Mock LLM response';
	private callCount: number = 0;

	constructor(config: LLMServiceConfig, tracker: LLMCallTracker) {
		super(config);
		this.tracker = tracker;
	}

	/**
	 * Initialize the mock provider
	 */
	protected async initializeProvider(): Promise<boolean> {
		this.logger.debug('MockLLMProvider initialized');
		return true;
	}

	/**
	 * Get the provider name
	 */
	public getProviderName(): string {
		return 'mock';
	}

	/**
	 * Get available models
	 */
	public getAvailableModels(): string[] {
		return ['mock-model-1', 'mock-model-2', 'mock-gpt-4'];
	}

	/**
	 * Create a completion
	 */
	public async createCompletion(options: LLMCompletionOptions): Promise<LLMCompletionResponse> {
		if (!this.isInitialized()) {
			throw new Error('MockLLMProvider not initialized');
		}

		this.callCount++;

		// Extract the user message for matching
		const userMessage = options.messages.find((msg) => msg.role === 'user');
		const promptKey = userMessage?.content || '';

		// Check if we have a mock response configured for this prompt
		const mockConfig = this.mockResponses.get(promptKey);

		// Simulate delay if configured
		if (mockConfig?.delay) {
			await new Promise((resolve) => setTimeout(resolve, mockConfig.delay));
		}

		// Simulate error if configured
		if (mockConfig?.shouldError) {
			const error = new Error(mockConfig.errorMessage || 'Mock LLM error');
			this.tracker.recordFailure(
				this.getProviderName(),
				options.model || this.config.defaultModel,
				options,
				error,
			);
			throw error;
		}

		// Determine response content
		const content = mockConfig?.content || this.defaultResponse;

		const response: LLMCompletionResponse = {
			content,
			model: options.model || this.config.defaultModel,
			provider: this.getProviderName(),
		};

		// Record the call
		this.tracker.recordCall(
			this.getProviderName(),
			options.model || this.config.defaultModel,
			options,
			response,
		);

		return response;
	}

	/**
	 * Set a mock response for a specific prompt
	 */
	setMockResponse(promptText: string, config: MockResponseConfig | string): void {
		const responseConfig: MockResponseConfig =
			typeof config === 'string' ? { content: config } : config;
		this.mockResponses.set(promptText, responseConfig);
	}

	/**
	 * Set the default response for unmatched prompts
	 */
	setDefaultResponse(response: string): void {
		this.defaultResponse = response;
	}

	/**
	 * Clear all mock responses
	 */
	clearMockResponses(): void {
		this.mockResponses.clear();
	}

	/**
	 * Get the number of calls made to this provider
	 */
	getCallCount(): number {
		return this.callCount;
	}

	/**
	 * Reset the call count
	 */
	resetCallCount(): void {
		this.callCount = 0;
	}

	/**
	 * Reset the provider to initial state
	 */
	reset(): void {
		this.mockResponses.clear();
		this.callCount = 0;
		this.defaultResponse = 'Mock LLM response';
	}
}

