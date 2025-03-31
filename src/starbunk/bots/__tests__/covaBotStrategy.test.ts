import { container, ServiceId } from '../../../services/container';
import covaBot from '../strategy-bots/cova-bot';
import { COVA_BOT_NAME, COVA_BOT_PATTERNS } from '../strategy-bots/cova-bot/constants';
import { mockLogger, mockMessage, mockWebhookService, mockDiscordServiceImpl, mockWriteMessage } from "../test-utils/testUtils";

// Minimal mock for LLM
const mockLLM = {
	createPromptCompletion: jest.fn().mockResolvedValue("Cova's response"),
	createCompletion: jest.fn().mockResolvedValue({ content: 'YES' }),
	getDefaultProvider: jest.fn().mockReturnValue({
		constructor: { name: 'MockLLMProvider' }
	})
};

// Reset DiscordService implementation for our tests
mockDiscordServiceImpl.sendMessageWithBotIdentity.mockImplementation((channelId, botIdentity, content) => {
	const channel = { id: channelId };
	const messageInfo = {
		botName: botIdentity.botName,
		avatarUrl: botIdentity.avatarUrl,
		content: content
	};
	// Call both so we can test either one
	mockWriteMessage(channel, messageInfo);
	return Promise.resolve({});
});

// Basic mocks that don't try to do too much
jest.mock('../../../services/bootstrap', () => ({
	getWebhookService: jest.fn().mockReturnValue(mockWebhookService),
	getLLMManager: jest.fn().mockReturnValue(mockLLM),
	getDiscordService: jest.fn().mockReturnValue(mockDiscordServiceImpl)
}));

// Simple mock for any other services
jest.mock('../../../services/personalityService', () => ({
	getPersonalityService: jest.fn().mockReturnValue({
		loadPersonalityEmbedding: jest.fn().mockResolvedValue(new Float32Array(384)),
		getPersonalityEmbedding: jest.fn().mockReturnValue(new Float32Array(384))
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
		mockDiscordServiceImpl.sendMessageWithBotIdentity.mockClear();
		mockWriteMessage.mockClear();

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
		// Use proper mock message
		const message = mockMessage('Hey cova, how are you?');
		// TypeScript workaround - make the guild property temporarily writable
		Object.defineProperty(message, 'guild', {
			writable: true,
			value: { id: '753251582719688714' }
		});
		
		// Set Math.random to ensure match
		Math.random = jest.fn().mockReturnValue(0);
		
		await covaBot.processMessage(message);
		expect(mockDiscordServiceImpl.sendMessageWithBotIdentity).toHaveBeenCalled();
	});

	it('should not respond to unrelated messages', async () => {
		// Make LLM return NO and Math.random return 1 to ensure no match
		mockLLM.createCompletion.mockResolvedValue({ content: 'NO' });
		Math.random = jest.fn().mockReturnValue(1);

		const message = mockMessage('This message has nothing to do with the bot');
		// TypeScript workaround - make the guild property temporarily writable
		Object.defineProperty(message, 'guild', {
			writable: true,
			value: { id: '753251582719688714' }
		});
		
		await covaBot.processMessage(message);
		expect(mockDiscordServiceImpl.sendMessageWithBotIdentity).not.toHaveBeenCalled();
	});

	it('should handle errors gracefully', async () => {
		// Make LLM throw an error
		mockLLM.createPromptCompletion.mockRejectedValue(new Error('Test error'));

		const message = mockMessage('Hey cova');
		// TypeScript workaround - make the guild property temporarily writable
		Object.defineProperty(message, 'guild', {
			writable: true,
			value: { id: '753251582719688714' }
		});
		
		await expect(covaBot.processMessage(message)).resolves.not.toThrow();

		// Reset the mock for subsequent tests
		mockLLM.createPromptCompletion.mockResolvedValue("Cova's response");
	});

	it('should handle regex pattern matches correctly', () => {
		// Test the bot's regex patterns
		expect(COVA_BOT_PATTERNS.Mention.test('Hey cova!')).toBe(true);
		expect(COVA_BOT_PATTERNS.Mention.test('Who is covadax?')).toBe(true);
		expect(COVA_BOT_PATTERNS.Mention.test('unrelated message')).toBe(false);
	});
});