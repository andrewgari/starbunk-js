import { container, ServiceId } from '../../../services/container';
import interruptBot from '@/starbunk/bots/reply-bots/interrupt-bot';
import { mockLogger, mockMessage, mockWebhookService } from '../test-utils/testUtils';
// Mock the WebhookService
jest.mock('../../../services/bootstrap', () => ({
	getWebhookService: jest.fn().mockImplementation(() => mockWebhookService),
}));

describe('interruptBot Strategy', () => {
	beforeEach(() => {
		// Clear mocks and reset container
		jest.clearAllMocks();
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);
		// Mock Math.random to return 0.02 (above the 1% chance)
		jest.spyOn(Math, 'random').mockReturnValue(0.02);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('should have the correct name', () => {
		expect(interruptBot.name).toBe('Interrupt Bot');
	});

	// For these tests, we'll just verify the bot structure instead of actual responses
	it('exists and has proper structure', () => {
		expect(interruptBot).toBeDefined();
		expect(interruptBot.name).toBe('Interrupt Bot');
		expect(typeof interruptBot.processMessage).toBe('function');
	});

	it('should not respond to unrelated messages', async () => {
		// Arrange
		const message = mockMessage('A completely unrelated message');

		// Act
		await interruptBot.processMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});
