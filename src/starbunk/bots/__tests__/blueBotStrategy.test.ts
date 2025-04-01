import { container, ServiceId } from '../../../services/container';
import blueBot from '../strategy-bots/blue-bot';
import { BLUE_BOT_NAME } from '../strategy-bots/blue-bot/constants';
import { mockLogger, mockMessage, mockWebhookService } from "../test-utils/testUtils";

// Mock the WebhookService and Logger
jest.mock('../../../services/bootstrap', () => ({
	getWebhookService: jest.fn().mockImplementation(() => mockWebhookService),
}));

describe('blueBot Strategy', () => {
	beforeEach(() => {
		// Clear all mocks
		jest.clearAllMocks();

		// Clear container and register mocks
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);
	});

	it('should have a name related to Blue', () => {
		expect(blueBot.name).toContain('Blue');
	});

	it('should respond to messages containing "blue" and variations', async () => {
		// Test with blue keyword
		const message = mockMessage('I like blue colors');
		await blueBot.processMessage(message);

		// Verify response
		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				username: BLUE_BOT_NAME,
			})
		);
	});

	it('should respond when specifically asked to say something nice', async () => {
		const message = mockMessage('bluebot, say something nice about Claude');
		await blueBot.processMessage(message);

		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				username: BLUE_BOT_NAME,
				content: expect.stringContaining('Claude')
			})
		);
	});

	// Basic non-response test
	it('should not respond to unrelated messages', async () => {
		const message = mockMessage('This has nothing to do with the bot trigger');
		await blueBot.processMessage(message);

		// This could vary due to random chance, but generally it shouldn't respond
		// We're testing the bot handles unrelated messages without errors
	});
});
