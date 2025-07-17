import { PromptType } from '@starbunk/shared';

/**
 * Mock LLM responses for different scenarios
 */
export const MOCK_LLM_RESPONSES = {
	// Cova emulator responses
	FRIENDLY_GREETING: "Hey there! How's it going?",
	HELPFUL_RESPONSE: "I'd be happy to help you with that!",
	CASUAL_CHAT: "That's pretty interesting, tell me more about it.",
	TECHNICAL_HELP: "Let me break that down for you step by step.",
	
	// Decision responses
	SHOULD_RESPOND_YES: "yes",
	SHOULD_RESPOND_NO: "no",
	SHOULD_RESPOND_MAYBE: "maybe",
	
	// Error scenarios
	EMPTY_RESPONSE: "",
	LONG_RESPONSE: "This is a very long response that goes on and on and on to test how the system handles lengthy outputs from the LLM service that might exceed normal limits.",
	
	// Personality-based responses
	COVA_PERSONALITY: "That's exactly the kind of thing I'd expect from this community! Love the energy here.",
	TECHNICAL_COVA: "Ah, diving into the technical details - my favorite kind of conversation!",
	SUPPORTIVE_COVA: "You've got this! I believe in you and I'm here if you need any help.",
	PERSONALITY_RESPONSE: "That's exactly the kind of thing I'd expect from this community! Love the energy here.",
};

/**
 * Mock LLM Manager for testing
 */
export class MockLLMManager {
	private responses: Map<string, string> = new Map();
	private shouldFail: boolean = false;
	private failureError: Error = new Error('Mock LLM service failure');
	private responseDelay: number = 0;

	/**
	 * Set a specific response for a prompt type
	 */
	setResponse(promptType: PromptType, response: string): void {
		this.responses.set(promptType, response);
	}

	/**
	 * Set multiple responses at once
	 */
	setResponses(responses: Record<PromptType, string>): void {
		Object.entries(responses).forEach(([promptType, response]) => {
			this.responses.set(promptType as PromptType, response);
		});
	}

	/**
	 * Configure the mock to fail on next request
	 */
	setShouldFail(shouldFail: boolean, error?: Error): void {
		this.shouldFail = shouldFail;
		if (error) {
			this.failureError = error;
		}
	}

	/**
	 * Set artificial delay for responses (to test timeout handling)
	 */
	setResponseDelay(delayMs: number): void {
		this.responseDelay = delayMs;
	}

	/**
	 * Mock implementation of createPromptCompletion
	 */
	createPromptCompletion = jest.fn().mockImplementation(async (
		promptType: PromptType,
		userMessage: string,
		options?: any
	): Promise<string> => {
		// Simulate delay if configured
		if (this.responseDelay > 0) {
			await new Promise(resolve => setTimeout(resolve, this.responseDelay));
		}

		// Simulate failure if configured
		if (this.shouldFail) {
			throw this.failureError;
		}

		// Return configured response or default
		const response = this.responses.get(promptType);
		if (response !== undefined) {
			return response;
		}

		// Default responses based on prompt type
		switch (promptType) {
			case PromptType.COVA_EMULATOR:
				return MOCK_LLM_RESPONSES.FRIENDLY_GREETING;
			case PromptType.COVA_DECISION:
				return MOCK_LLM_RESPONSES.SHOULD_RESPOND_YES;
			default:
				return "Mock LLM response";
		}
	});

	/**
	 * Reset all mock configurations
	 */
	reset(): void {
		this.responses.clear();
		this.shouldFail = false;
		this.responseDelay = 0;
		this.failureError = new Error('Mock LLM service failure');
	}

	/**
	 * Get call history for testing
	 */
	getCallHistory(): Array<{ promptType: PromptType; userMessage: string; timestamp: number }> {
		// In a real implementation, this would track calls
		// For now, return empty array
		return [];
	}
}

/**
 * Mock personality service
 */
export class MockPersonalityService {
	private personalityEmbedding: number[] = [0.1, 0.2, 0.3, 0.4, 0.5];
	private shouldFail: boolean = false;

	setPersonalityEmbedding(embedding: number[]): void {
		this.personalityEmbedding = embedding;
	}

	setShouldFail(shouldFail: boolean): void {
		this.shouldFail = shouldFail;
	}

	getPersonalityEmbedding(): number[] {
		if (this.shouldFail) {
			throw new Error('Mock personality service failure');
		}
		return this.personalityEmbedding;
	}

	reset(): void {
		this.personalityEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];
		this.shouldFail = false;
	}
}

/**
 * Factory function to create a mock LLM manager
 */
export function createMockLLMManager(): MockLLMManager {
	return new MockLLMManager();
}

/**
 * Factory function to create a mock personality service
 */
export function createMockPersonalityService(): MockPersonalityService {
	return new MockPersonalityService();
}

/**
 * Helper to mock the getLLMManager function from @starbunk/shared
 */
export function mockGetLLMManager(mockManager: MockLLMManager): jest.MockedFunction<any> {
	return jest.fn().mockReturnValue(mockManager);
}

/**
 * Helper to mock the getPersonalityService function from @starbunk/shared
 */
export function mockGetPersonalityService(mockService: MockPersonalityService): jest.MockedFunction<any> {
	return jest.fn().mockReturnValue(mockService);
}

/**
 * Common LLM test scenarios
 */
export const LLM_TEST_SCENARIOS = {
	SUCCESSFUL_RESPONSE: {
		promptType: PromptType.COVA_EMULATOR,
		userMessage: "Hello CovaBot!",
		expectedResponse: MOCK_LLM_RESPONSES.FRIENDLY_GREETING,
	},
	DECISION_YES: {
		promptType: PromptType.COVA_DECISION,
		userMessage: "Should I respond to this message?",
		expectedResponse: MOCK_LLM_RESPONSES.SHOULD_RESPOND_YES,
	},
	DECISION_NO: {
		promptType: PromptType.COVA_DECISION,
		userMessage: "Should I respond to this spam?",
		expectedResponse: MOCK_LLM_RESPONSES.SHOULD_RESPOND_NO,
	},
	TIMEOUT_SCENARIO: {
		promptType: PromptType.COVA_EMULATOR,
		userMessage: "This will timeout",
		delay: 5000, // 5 second delay
	},
	FAILURE_SCENARIO: {
		promptType: PromptType.COVA_EMULATOR,
		userMessage: "This will fail",
		error: new Error('LLM API rate limit exceeded'),
	},
};
