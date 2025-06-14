import { Message } from 'discord.js';
import { createLLMEmulatorResponse, createLLMResponseDecisionCondition } from '../llm-triggers';
import { getLLMManager } from '../../../../../services/bootstrap';
import { getPersonalityService } from '../../../../../services/personalityService';
import { logger } from '../../../../../services/logger';
import userId from '../../../../../discord/userId';

// Mock dependencies
jest.mock('../../../../../services/bootstrap');
jest.mock('../../../../../services/personalityService');
jest.mock('../../../../../services/logger');
jest.mock('../../../../../discord/userId', () => ({
	Cova: 'cova-user-id'
}));

describe('LLM Triggers', () => {
	let mockMessage: Partial<Message>;
	let mockLLMManager: any;
	let mockPersonalityService: any;

	beforeEach(() => {
		jest.clearAllMocks();

		// Mock LLM Manager
		mockLLMManager = {
			createPromptCompletion: jest.fn()
		};
		(getLLMManager as jest.Mock).mockReturnValue(mockLLMManager);

		// Mock Personality Service
		mockPersonalityService = {
			getPersonalityEmbedding: jest.fn().mockReturnValue(new Float32Array([1, 2, 3]))
		};
		(getPersonalityService as jest.Mock).mockReturnValue(mockPersonalityService);

		// Mock message
		mockMessage = {
			author: {
				username: 'testuser',
				bot: false
			},
			content: 'Hello Cova!',
			channelId: 'channel123',
			channel: {
				name: 'general'
			},
			mentions: {
				has: jest.fn().mockReturnValue(false)
			}
		} as any;
	});

	describe('createLLMEmulatorResponse', () => {
		it('should generate a response using LLM with personality context', async () => {
			const mockResponse = 'Hello there! How are you doing?';
			mockLLMManager.createPromptCompletion.mockResolvedValue(mockResponse);

			const responseGenerator = createLLMEmulatorResponse();
			const result = await responseGenerator(mockMessage as Message);

			expect(result).toBe(mockResponse);
			expect(mockLLMManager.createPromptCompletion).toHaveBeenCalledWith(
				'COVA_EMULATOR',
				expect.stringContaining('Channel: general'),
				expect.objectContaining({
					temperature: 0.7,
					maxTokens: 250,
					contextData: {
						personalityEmbedding: [1, 2, 3]
					}
				})
			);
		});

		it('should handle empty LLM response with fallback', async () => {
			mockLLMManager.createPromptCompletion.mockResolvedValue('');

			const responseGenerator = createLLMEmulatorResponse();
			const result = await responseGenerator(mockMessage as Message);

			expect(result).toBeDefined();
			expect(result.length).toBeGreaterThan(0);
			expect(logger.debug).toHaveBeenCalledWith(
				expect.stringContaining('Received empty response from LLM')
			);
		});

		it('should truncate long responses', async () => {
			const longResponse = 'A'.repeat(2000);
			mockLLMManager.createPromptCompletion.mockResolvedValue(longResponse);

			const responseGenerator = createLLMEmulatorResponse();
			const result = await responseGenerator(mockMessage as Message);

			expect(result.length).toBeLessThanOrEqual(1900 + '... (truncated)'.length);
			expect(result).toContain('... (truncated)');
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('Response exceeded Discord\'s character limit')
			);
		});

		it('should handle LLM errors gracefully', async () => {
			mockLLMManager.createPromptCompletion.mockRejectedValue(new Error('LLM service unavailable'));

			const responseGenerator = createLLMEmulatorResponse();
			const result = await responseGenerator(mockMessage as Message);

			expect(result).toBeDefined();
			expect(result.length).toBeGreaterThan(0);
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('LLM service error')
			);
		});

		it('should handle missing personality embedding', async () => {
			mockPersonalityService.getPersonalityEmbedding.mockReturnValue(null);
			mockLLMManager.createPromptCompletion.mockResolvedValue('Test response');

			const responseGenerator = createLLMEmulatorResponse();
			const result = await responseGenerator(mockMessage as Message);

			expect(result).toBe('Test response');
			expect(mockLLMManager.createPromptCompletion).toHaveBeenCalledWith(
				'COVA_EMULATOR',
				expect.any(String),
				expect.objectContaining({
					contextData: {
						personalityEmbedding: undefined
					}
				})
			);
		});
	});

	describe('createLLMResponseDecisionCondition', () => {
		it('should always respond to direct mentions', async () => {
			(mockMessage.mentions!.has as jest.Mock).mockReturnValue(true);

			const decisionCondition = createLLMResponseDecisionCondition();
			const result = await decisionCondition(mockMessage as Message);

			expect(result).toBe(true);
			expect(logger.debug).toHaveBeenCalledWith(
				expect.stringContaining('Direct mention detected')
			);
		});

		it('should not respond to bot messages', async () => {
			mockMessage.author!.bot = true;

			const decisionCondition = createLLMResponseDecisionCondition();
			const result = await decisionCondition(mockMessage as Message);

			expect(result).toBe(false);
		});

		it('should use LLM to make response decisions', async () => {
			mockLLMManager.createPromptCompletion.mockResolvedValue('YES');

			const decisionCondition = createLLMResponseDecisionCondition();
			const result = await decisionCondition(mockMessage as Message);

			expect(mockLLMManager.createPromptCompletion).toHaveBeenCalledWith(
				'COVA_DECISION',
				expect.stringContaining('should Cova respond to this message?'),
				expect.objectContaining({
					temperature: 0.2,
					maxTokens: 10
				})
			);
			// Result depends on randomization, but should be boolean
			expect(typeof result).toBe('boolean');
		});

		it('should handle different LLM decision responses', async () => {
			const testCases = ['YES', 'LIKELY', 'UNLIKELY', 'NO'];
			
			for (const response of testCases) {
				mockLLMManager.createPromptCompletion.mockResolvedValue(response);
				
				const decisionCondition = createLLMResponseDecisionCondition();
				const result = await decisionCondition(mockMessage as Message);
				
				expect(typeof result).toBe('boolean');
			}
		});

		it('should fall back to random decision on LLM error', async () => {
			mockLLMManager.createPromptCompletion.mockRejectedValue(new Error('LLM error'));

			const decisionCondition = createLLMResponseDecisionCondition();
			const result = await decisionCondition(mockMessage as Message);

			expect(typeof result).toBe('boolean');
			expect(logger.error).toHaveBeenCalledWith(
				expect.stringContaining('Error in decision logic'),
				expect.any(Error)
			);
		});

		it('should handle channel name extraction safely', async () => {
			// Test with channel that has no name property
			mockMessage.channel = {} as any;
			mockLLMManager.createPromptCompletion.mockResolvedValue('YES');

			const decisionCondition = createLLMResponseDecisionCondition();
			const result = await decisionCondition(mockMessage as Message);

			expect(typeof result).toBe('boolean');
			expect(mockLLMManager.createPromptCompletion).toHaveBeenCalledWith(
				'COVA_DECISION',
				expect.stringContaining('Channel: Unknown Channel'),
				expect.any(Object)
			);
		});
	});
});
