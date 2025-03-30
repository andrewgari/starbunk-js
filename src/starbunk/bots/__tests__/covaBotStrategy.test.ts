import { container, ServiceId } from '../../../services/container';
import covaBot from '../strategy-bots/cova-bot';
import { COVA_BOT_NAME, COVA_BOT_PATTERNS } from '../strategy-bots/cova-bot/constants';
import { mockLogger, mockMessage, mockWebhookService } from "../test-utils/testUtils";

// Minimal mock for LLM
const mockLLM = {
	createPromptCompletion: jest.fn().mockResolvedValue("Cova's response"),
	createCompletion: jest.fn().mockResolvedValue({ content: 'YES' })
};

// Basic mocks that don't try to do too much
jest.mock('../../../services/bootstrap', () => ({
	getWebhookService: jest.fn().mockReturnValue(mockWebhookService),
	getLLMManager: jest.fn().mockReturnValue(mockLLM)
}));

// Simple mock for any other services
jest.mock('../../../services/personalityService', () => ({
	getPersonalityService: jest.fn().mockReturnValue({
		loadPersonalityEmbedding: jest.fn(),
		getPersonalityEmbedding: jest.fn()
	})
}));

describe('covaBot Strategy', () => {
	// Original Math.random implementation
	const originalRandom = Math.random;

	beforeEach(() => {
		jest.clearAllMocks();
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);

		// Reset mocks
		mockLLM.createPromptCompletion.mockResolvedValue("Cova's response");
		mockLLM.createCompletion.mockResolvedValue({ content: 'YES' });

		// Mock Math.random to always return 0 (ensures probability checks pass)
		Math.random = jest.fn().mockReturnValue(0);
	});

	afterEach(() => {
		// Restore original Math.random
		Math.random = originalRandom;
	});

	it('should have the correct name', () => {
		expect(covaBot.name).toBe(COVA_BOT_NAME);
	});

	it('exists and has proper structure', () => {
		expect(covaBot).toBeDefined();
		expect(covaBot.name).toBe(COVA_BOT_NAME);
		expect(typeof covaBot.processMessage).toBe('function');
	});

	it('should not throw errors when processing a message', async () => {
		const message = mockMessage('Hey cova');
		await expect(covaBot.processMessage(message)).resolves.not.toThrow();
	});

	it('should respond to messages containing "cova"', async () => {
		const message = mockMessage('Hey cova, how are you?');
		await covaBot.processMessage(message);
		expect(mockWebhookService.writeMessage).toHaveBeenCalled();
	});

	it('should not respond to unrelated messages', async () => {
		// Make LLM return NO and Math.random return 1 to ensure no match
		mockLLM.createCompletion.mockResolvedValue({ content: 'NO' });
		Math.random = jest.fn().mockReturnValue(1);

		const message = mockMessage('This message has nothing to do with the bot');
		await covaBot.processMessage(message);
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should handle errors gracefully', async () => {
		// Make LLM throw an error
		mockLLM.createPromptCompletion.mockRejectedValue(new Error('Test error'));

		const message = mockMessage('Hey cova');
		await expect(covaBot.processMessage(message)).resolves.not.toThrow();

		// Should still attempt to send a response (using fallback)
		expect(mockWebhookService.writeMessage).toHaveBeenCalled();
	});

	it('should handle regex pattern matches correctly', () => {
		// Test the bot's regex patterns
		expect(COVA_BOT_PATTERNS.Mention.test('Hey cova!')).toBe(true);
		expect(COVA_BOT_PATTERNS.Mention.test('Who is covadax?')).toBe(true);
		expect(COVA_BOT_PATTERNS.Mention.test('unrelated message')).toBe(false);
	});
});
