import { container, ServiceId } from '../../../services/container';
import attitudeBot from '../strategy-bots/attitude-bot';
import {
	ATTITUDE_BOT_AVATAR_URL,
	ATTITUDE_BOT_NAME,
	ATTITUDE_BOT_RESPONSES
} from '../strategy-bots/attitude-bot/constants';
import { mockLogger, mockMessage, mockWebhookService } from "../test-utils/testUtils";

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

	it('should have the correct name', () => {
		expect(attitudeBot.name).toBe(ATTITUDE_BOT_NAME);
	});

	it('should respond to "can\'t" statements', async () => {
		// Arrange
		const message = mockMessage('I can\'t do this');

		// Act
		await attitudeBot.processMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).toHaveBeenCalledTimes(1);
		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				botName: ATTITUDE_BOT_NAME,
				avatarUrl: ATTITUDE_BOT_AVATAR_URL,
				content: ATTITUDE_BOT_RESPONSES.Default
			})
		);
	});

	it('should not respond to messages without negative statements', async () => {
		// Arrange
		const message = mockMessage('I am able to do this');

		// Act
		await attitudeBot.processMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});
