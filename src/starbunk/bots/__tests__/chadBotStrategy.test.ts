import { container, ServiceId } from '../../../services/container';
import chadBot from '../strategy-bots/chad-bot';
import { CHAD_BOT_NAME } from '../strategy-bots/chad-bot/constants';
import { mockLogger, mockMessage, mockWebhookService } from "../test-utils/testUtils";

// Mock the WebhookService
// No need to mock bootstrap here as it's already done in testUtils

describe('ChadBot Strategy', () => {
	beforeEach(() => {
		// Clear mocks and reset container
		jest.clearAllMocks();
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);
	});

	it('should respond to gym-related messages', async () => {
		// Test with a gym keyword
		const message = mockMessage('I need to go to the gym more often');
		await chadBot.processMessage(message);

		// Verify it responded
		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				botName: CHAD_BOT_NAME
			})
		);
	});

	it('should respond to bro messages', async () => {
		// Test with a bro keyword
		const message = mockMessage("What's up bro?");
		await chadBot.processMessage(message);

		// Verify it responded
		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				botName: CHAD_BOT_NAME
			})
		);
	});

	// Basic test for non-matching messages
	it('should not respond to unrelated messages', async () => {
		const message = mockMessage('This is a normal message with nothing interesting');
		await chadBot.processMessage(message);
		
		// Verify it didn't respond
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});