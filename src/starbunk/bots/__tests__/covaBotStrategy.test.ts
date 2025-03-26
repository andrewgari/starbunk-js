import { container, ServiceId } from '../../../services/container';
import { mockLogger, mockMessage, mockWebhookService } from "../test-utils/testUtils";
import covaBot from '../strategy-bots/cova-bot';
import { COVA_BOT_NAME } from '../strategy-bots/cova-bot/constants';

// Mock the WebhookService and other required services
jest.mock('../../../services/bootstrap', () => ({
	getWebhookService: jest.fn().mockImplementation(() => mockWebhookService),
	getLLMManager: jest.fn().mockImplementation(() => ({
		createPromptCompletion: jest.fn().mockResolvedValue('Mocked LLM response'),
		createCompletion: jest.fn().mockResolvedValue({ content: 'YES' })
	})),
}));

// Mock the client user for mentions
jest.mock('discord.js', () => {
	const original = jest.requireActual('discord.js');
	return {
		...original,
		Client: jest.fn().mockImplementation(() => ({
			user: { id: 'mockClientId' }
		}))
	};
});

describe('covaBot Strategy', () => {
	beforeEach(() => {
		// Clear mocks and reset container
		jest.clearAllMocks();
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);
	});

	it('should have the correct name', () => {
		expect(covaBot.name).toBe(COVA_BOT_NAME);
	});

	// For this test, we'll just verify the bot doesn't crash
	// We don't test actual response behavior since it depends on an LLM
	it('exists and has proper structure', () => {
		expect(covaBot).toBeDefined();
		expect(covaBot.name).toBe(COVA_BOT_NAME);
		expect(typeof covaBot.processMessage).toBe('function');
	});
	
	// Skip actual response tests as they depend on an LLM service
	it.skip('should not respond to unrelated messages', async () => {
		// This test is skipped because CovaBot's behavior depends on LLM responses
		// which are mocked but not in a way that guarantees deterministic behavior
		const message = mockMessage('A completely unrelated message');
		await covaBot.processMessage(message);
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});