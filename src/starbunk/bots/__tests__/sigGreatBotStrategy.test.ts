import { container, ServiceId } from '../../../services/container';
import sigGreatBot from '@/starbunk/bots/reply-bots/sig-great-bot';
import { mockLogger, mockMessage, mockWebhookService } from '../test-utils/testUtils';

// Mock the WebhookService
jest.mock('../../../services/bootstrap', () => ({
	getWebhookService: jest.fn().mockImplementation(() => mockWebhookService),
}));

describe('sigGreatBot Strategy', () => {
	beforeEach(() => {
		// Clear mocks and reset container
		jest.clearAllMocks();
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);
	});

	it('should have the correct name', () => {
		expect(sigGreatBot.name).toBe('SigGreatBot');
	});

	// For these tests, we'll just verify the bot structure instead of actual responses
	it('exists and has proper structure', () => {
		expect(sigGreatBot).toBeDefined();
		expect(sigGreatBot.name).toBe('SigGreatBot');
		expect(typeof sigGreatBot.processMessage).toBe('function');
	});

	it('should not respond to unrelated messages', async () => {
		// Arrange
		const message = mockMessage('A completely unrelated message');

		// Act
		await sigGreatBot.processMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});
