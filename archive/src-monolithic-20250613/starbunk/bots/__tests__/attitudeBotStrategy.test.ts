import { container, ServiceId } from '../../../services/container';
import attitudeBot from '@/starbunk/bots/reply-bots/attitude-bot';
import { ATTITUDE_BOT_NAME } from '@/starbunk/bots/reply-bots/attitude-bot/constants';
import { mockLogger, mockMessage, mockWebhookService } from '../test-utils/testUtils';

// Mock the WebhookService
jest.mock('../../../services/bootstrap', () => ({
	getWebhookService: jest.fn().mockImplementation(() => mockWebhookService),
}));

describe('AttitudeBot Strategy', () => {
	beforeEach(() => {
		// Clear mocks and reset container
		jest.clearAllMocks();
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);
	});

	it('should respond to negative statements', async () => {
		// Test with a typical trigger phrase
		const message = mockMessage("I can't do this");
		await attitudeBot.processMessage(message);

		// Verify it responded
		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				username: ATTITUDE_BOT_NAME,
			}),
		);
	});

	it('should not respond to positive statements', async () => {
		// Test with non-trigger phrase
		const message = mockMessage('I am able to do this');
		await attitudeBot.processMessage(message);

		// Verify it didn't respond
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});
