import { createLLMEmulatorResponse } from '../../cova-bot/llm-triggers';
import { getLLMManager, getPersonalityService, PromptType } from '@starbunk/shared';
import { QdrantMemoryService } from '../qdrantMemoryService';
import {
	MockLLMManager,
	MockPersonalityService,
	MOCK_LLM_RESPONSES,
	LLM_TEST_SCENARIOS,
	createMockLLMManager,
	createMockPersonalityService,
} from '../../__tests__/mocks/llm-mocks';
import { createMockMemoryService } from '../../__tests__/mocks/database-mocks';
import { MockDiscordMessage } from '../../__tests__/mocks/discord-mocks';

// Mock dependencies
jest.mock('@starbunk/shared', () => ({
	getLLMManager: jest.fn(),
	getPersonalityService: jest.fn(),
	PromptType: {
		COVA_EMULATOR: 'COVA_EMULATOR',
		COVA_DECISION: 'COVA_DECISION',
	},
	PromptRegistry: {
		registerPrompt: jest.fn(),
	},
	logger: {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
	},
}));

jest.mock('../qdrantMemoryService');

const mockGetLLMManager = getLLMManager as jest.MockedFunction<typeof getLLMManager>;
const mockGetPersonalityService = getPersonalityService as jest.MockedFunction<typeof getPersonalityService>;
const MockQdrantMemoryService = QdrantMemoryService as jest.MockedClass<typeof QdrantMemoryService>;

describe('LLM Integration - Comprehensive Tests', () => {
	let mockLLMManager: MockLLMManager;
	let mockPersonalityService: MockPersonalityService;
	let mockMemoryService: any;

	beforeEach(() => {
		jest.clearAllMocks();

		// Create mock services
		mockLLMManager = createMockLLMManager();
		mockPersonalityService = createMockPersonalityService();
		mockMemoryService = createMockMemoryService();

		// Setup mock returns
		mockGetLLMManager.mockReturnValue(mockLLMManager as any);
		mockGetPersonalityService.mockReturnValue(mockPersonalityService as any);
		MockQdrantMemoryService.getInstance = jest.fn().mockReturnValue(mockMemoryService);

		// Reset all mocks
		mockLLMManager.reset();
		mockPersonalityService.reset();
		mockMemoryService.reset();
	});

	describe('Successful LLM Communication', () => {
		it.skip('should successfully generate response with personality context', async () => {
			mockLLMManager.setResponse(PromptType.COVA_EMULATOR, MOCK_LLM_RESPONSES.FRIENDLY_GREETING);

			const responseGenerator = createLLMEmulatorResponse();
			const message = new MockDiscordMessage('Hello CovaBot!', 'user-123');

			const response = await responseGenerator(message as any);

			expect(response).toBe(MOCK_LLM_RESPONSES.FRIENDLY_GREETING);
			expect(mockLLMManager.createPromptCompletion).toHaveBeenCalledWith(
				PromptType.COVA_EMULATOR,
				expect.stringContaining('Hello CovaBot!'),
				expect.any(Object)
			);
		});

		it.skip('should include personality context in LLM prompt', async () => {
			mockLLMManager.setResponse(PromptType.COVA_EMULATOR, MOCK_LLM_RESPONSES.PERSONALITY_RESPONSE);

			const responseGenerator = createLLMEmulatorResponse();
			const message = new MockDiscordMessage('What do you think about programming?', 'user-123');

			await responseGenerator(message as any);

			// Verify that personality service was called
			expect(mockPersonalityService.getPersonalityEmbedding).toHaveBeenCalled();

			// Verify that memory service was called for enhanced context
			expect(mockMemoryService.generateEnhancedContext).toHaveBeenCalledWith(
				'What do you think about programming?',
				'user-123',
				'test-channel-123',
				expect.objectContaining({
					maxPersonalityNotes: 10,
					maxConversationHistory: 8,
				})
			);
		});

		it.skip('should handle different message types and contexts', async () => {
			const testCases = [
				{ content: 'Short message', expectedResponse: MOCK_LLM_RESPONSES.CASUAL_CHAT },
				{ content: 'Can you help me with this technical problem?', expectedResponse: MOCK_LLM_RESPONSES.TECHNICAL_HELP },
				{ content: 'How are you doing today?', expectedResponse: MOCK_LLM_RESPONSES.FRIENDLY_GREETING },
			];

			const responseGenerator = createLLMEmulatorResponse();

			for (const testCase of testCases) {
				mockLLMManager.setResponse(PromptType.COVA_EMULATOR, testCase.expectedResponse);

				const message = new MockDiscordMessage(testCase.content, 'user-123');
				const response = await responseGenerator(message as any);

				expect(response).toBe(testCase.expectedResponse);
			}
		});

		it.skip('should include channel and user context in prompt', async () => {
			mockLLMManager.setResponse(PromptType.COVA_EMULATOR, MOCK_LLM_RESPONSES.HELPFUL_RESPONSE);

			const responseGenerator = createLLMEmulatorResponse();
			const message = new MockDiscordMessage('Help me', 'specific-user-456');
			message.channel.name = 'help-channel';
			message.author.username = 'HelpSeeker';

			await responseGenerator(message as any);

			// Verify the prompt includes context
			const callArgs = mockLLMManager.createPromptCompletion.mock.calls[0];
			const userPrompt = callArgs[1];

			expect(userPrompt).toContain('help-channel');
			expect(userPrompt).toContain('HelpSeeker');
			expect(userPrompt).toContain('Help me');
		});
	});

	describe.skip('LLM API Failure Handling', () => {
		it('should handle LLM API failures gracefully', async () => {
			const apiError = new Error('LLM API rate limit exceeded');
			mockLLMManager.setShouldFail(true, apiError);

			const responseGenerator = createLLMEmulatorResponse();
			const message = new MockDiscordMessage('This will fail', 'user-123');

			const response = await responseGenerator(message as any);

			// Should return fallback response or handle error gracefully
			expect(typeof response === 'string' || response === null).toBe(true);
		});

		it('should handle LLM API timeouts', async () => {
			mockLLMManager.setResponseDelay(10000); // 10 second delay to simulate timeout

			const responseGenerator = createLLMEmulatorResponse();
			const message = new MockDiscordMessage('This will timeout', 'user-123');

			// Set a reasonable timeout for the test
			const timeoutPromise = new Promise((_, reject) => 
				setTimeout(() => reject(new Error('Test timeout')), 1000)
			);

			await expect(Promise.race([
				responseGenerator(message as any),
				timeoutPromise
			])).rejects.toThrow('Test timeout');
		});

		it('should handle empty LLM responses', async () => {
			mockLLMManager.setResponse(PromptType.COVA_EMULATOR, MOCK_LLM_RESPONSES.EMPTY_RESPONSE);

			const responseGenerator = createLLMEmulatorResponse();
			const message = new MockDiscordMessage('Empty response test', 'user-123');

			const response = await responseGenerator(message as any);

			// Should handle empty response appropriately
			expect(response === '' || response === null).toBe(true);
		});

		it('should handle malformed LLM responses', async () => {
			// Mock LLM returning non-string response
			mockLLMManager.createPromptCompletion = jest.fn().mockResolvedValue(null);

			const responseGenerator = createLLMEmulatorResponse();
			const message = new MockDiscordMessage('Malformed response test', 'user-123');

			const response = await responseGenerator(message as any);

			// Should handle gracefully
			expect(typeof response === 'string' || response === null).toBe(true);
		});

		it('should handle network connectivity issues', async () => {
			const networkError = new Error('Network connection failed');
			networkError.name = 'NetworkError';
			mockLLMManager.setShouldFail(true, networkError);

			const responseGenerator = createLLMEmulatorResponse();
			const message = new MockDiscordMessage('Network test', 'user-123');

			const response = await responseGenerator(message as any);

			// Should handle network errors gracefully
			expect(typeof response === 'string' || response === null).toBe(true);
		});
	});

	describe.skip('Response Processing and Formatting', () => {
		it('should properly format LLM responses for Discord', async () => {
			const rawResponse = 'This is a response with **bold** and *italic* text.';
			mockLLMManager.setResponse(PromptType.COVA_EMULATOR, rawResponse);

			const responseGenerator = createLLMEmulatorResponse();
			const message = new MockDiscordMessage('Format test', 'user-123');

			const response = await responseGenerator(message as any);

			expect(response).toBe(rawResponse);
			// In a real implementation, this might include Discord formatting validation
		});

		it('should handle very long LLM responses', async () => {
			mockLLMManager.setResponse(PromptType.COVA_EMULATOR, MOCK_LLM_RESPONSES.LONG_RESPONSE);

			const responseGenerator = createLLMEmulatorResponse();
			const message = new MockDiscordMessage('Long response test', 'user-123');

			const response = await responseGenerator(message as any);

			expect(response).toBe(MOCK_LLM_RESPONSES.LONG_RESPONSE);
			// In a real implementation, this might include length validation/truncation
		});

		it('should sanitize potentially harmful content', async () => {
			const harmfulResponse = '<script>alert("xss")</script>This is a normal response.';
			mockLLMManager.setResponse(PromptType.COVA_EMULATOR, harmfulResponse);

			const responseGenerator = createLLMEmulatorResponse();
			const message = new MockDiscordMessage('Harmful content test', 'user-123');

			const response = await responseGenerator(message as any);

			// Response should be returned (Discord handles content safety)
			expect(response).toBe(harmfulResponse);
		});
	});

	describe.skip('Personality Service Integration', () => {
		it('should handle personality service failures gracefully', async () => {
			mockPersonalityService.setShouldFail(true);
			mockLLMManager.setResponse(PromptType.COVA_EMULATOR, MOCK_LLM_RESPONSES.FRIENDLY_GREETING);

			const responseGenerator = createLLMEmulatorResponse();
			const message = new MockDiscordMessage('Personality failure test', 'user-123');

			const response = await responseGenerator(message as any);

			// Should still generate response even if personality service fails
			expect(response).toBe(MOCK_LLM_RESPONSES.FRIENDLY_GREETING);
		});

		it('should use personality embedding in context generation', async () => {
			const customEmbedding = [0.9, 0.8, 0.7, 0.6, 0.5];
			mockPersonalityService.setPersonalityEmbedding(customEmbedding);
			mockLLMManager.setResponse(PromptType.COVA_EMULATOR, MOCK_LLM_RESPONSES.COVA_PERSONALITY);

			const responseGenerator = createLLMEmulatorResponse();
			const message = new MockDiscordMessage('Personality test', 'user-123');

			await responseGenerator(message as any);

			expect(mockPersonalityService.getPersonalityEmbedding).toHaveBeenCalled();
		});
	});

	describe.skip('Memory Service Integration', () => {
		it('should handle memory service failures gracefully', async () => {
			mockMemoryService.setShouldFail(true);
			mockLLMManager.setResponse(PromptType.COVA_EMULATOR, MOCK_LLM_RESPONSES.FRIENDLY_GREETING);

			const responseGenerator = createLLMEmulatorResponse();
			const message = new MockDiscordMessage('Memory failure test', 'user-123');

			const response = await responseGenerator(message as any);

			// Should still generate response even if memory service fails
			expect(response).toBe(MOCK_LLM_RESPONSES.FRIENDLY_GREETING);
		});

		it('should include conversation history in context', async () => {
			mockLLMManager.setResponse(PromptType.COVA_EMULATOR, MOCK_LLM_RESPONSES.HELPFUL_RESPONSE);

			const responseGenerator = createLLMEmulatorResponse();
			const message = new MockDiscordMessage('Context test', 'user-123');

			await responseGenerator(message as any);

			expect(mockMemoryService.generateEnhancedContext).toHaveBeenCalledWith(
				'Context test',
				'user-123',
				'test-channel-123',
				expect.objectContaining({
					maxPersonalityNotes: expect.any(Number),
					maxConversationHistory: expect.any(Number),
					personalityWeight: expect.any(Number),
					conversationWeight: expect.any(Number),
					similarityThreshold: expect.any(Number),
				})
			);
		});
	});

	describe.skip('Channel Context Handling', () => {
		it('should handle different channel types', async () => {
			mockLLMManager.setResponse(PromptType.COVA_EMULATOR, MOCK_LLM_RESPONSES.CASUAL_CHAT);

			const responseGenerator = createLLMEmulatorResponse();

			// Test different channel scenarios
			const testCases = [
				{ channelName: 'general', expectedInPrompt: 'general' },
				{ channelName: undefined, expectedInPrompt: 'Direct Message' },
				{ channelName: 'tech-support', expectedInPrompt: 'tech-support' },
			];

			for (const testCase of testCases) {
				const message = new MockDiscordMessage('Channel test', 'user-123');
				if (testCase.channelName) {
					message.channel.name = testCase.channelName;
				} else {
					// Simulate DM by removing name property
					delete (message.channel as any).name;
				}

				await responseGenerator(message as any);

				const callArgs = mockLLMManager.createPromptCompletion.mock.calls.slice(-1)[0];
				const userPrompt = callArgs[1];
				expect(userPrompt).toContain(testCase.expectedInPrompt);
			}
		});

		it('should handle channel name resolution errors gracefully', async () => {
			mockLLMManager.setResponse(PromptType.COVA_EMULATOR, MOCK_LLM_RESPONSES.FRIENDLY_GREETING);

			const responseGenerator = createLLMEmulatorResponse();
			const message = new MockDiscordMessage('Error test', 'user-123');

			// Simulate error in channel name access
			Object.defineProperty(message.channel, 'name', {
				get: () => { throw new Error('Channel access error'); }
			});

			const response = await responseGenerator(message as any);

			// Should handle error gracefully and still generate response
			expect(response).toBe(MOCK_LLM_RESPONSES.FRIENDLY_GREETING);
		});
	});

	describe('Performance and Optimization', () => {
		it('should complete within reasonable time limits', async () => {
			mockLLMManager.setResponse(PromptType.COVA_EMULATOR, MOCK_LLM_RESPONSES.FRIENDLY_GREETING);

			const responseGenerator = createLLMEmulatorResponse();
			const message = new MockDiscordMessage('Performance test', 'user-123');

			const startTime = Date.now();
			await responseGenerator(message as any);
			const endTime = Date.now();

			// Should complete within 5 seconds (generous for testing)
			expect(endTime - startTime).toBeLessThan(5000);
		});

		it.skip('should handle concurrent requests properly', async () => {
			mockLLMManager.setResponse(PromptType.COVA_EMULATOR, MOCK_LLM_RESPONSES.FRIENDLY_GREETING);

			const responseGenerator = createLLMEmulatorResponse();
			const messages = Array(5).fill(null).map((_, i) =>
				new MockDiscordMessage(`Concurrent test ${i}`, `user-${i}`)
			);

			const promises = messages.map(message => responseGenerator(message as any));
			const responses = await Promise.all(promises);

			// All should succeed
			responses.forEach(response => {
				expect(response).toBe(MOCK_LLM_RESPONSES.FRIENDLY_GREETING);
			});
		});
	});
});
