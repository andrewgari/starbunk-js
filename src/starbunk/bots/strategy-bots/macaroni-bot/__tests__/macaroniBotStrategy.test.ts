import macaroniBot from '..';
import { container, ServiceId } from '../../../../../services/container';
import { mockLogger, mockMessage, mockWebhookService } from '../../../test-utils/testUtils';
import {
	MACARONI_BOT_NAME,
	MACARONI_BOT_RESPONSES
} from '../constants';

// Mock the WebhookService
jest.mock('../../../../../services/bootstrap', () => ({
	getWebhookService: jest.fn().mockImplementation(() => mockWebhookService),
}));

describe('macaroniBot Strategy', () => {
	beforeEach(() => {
		// Clear mocks and reset container
		jest.clearAllMocks();
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);
	});

	it('should have the correct name', () => {
		expect(macaroniBot.name).toBe(MACARONI_BOT_NAME);
	});

	it('should respond to pasta mentions', async () => {
		// Arrange
		const message = mockMessage('I like pasta and spaghetti');

		// Act
		await macaroniBot.processMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).toHaveBeenCalledTimes(1);
		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				username: MACARONI_BOT_NAME,
				content: MACARONI_BOT_RESPONSES.Macaroni
			})
		);
	});

	it('should not respond to unrelated messages', async () => {
		// Arrange
		const message = mockMessage('A completely unrelated message');

		// Act
		await macaroniBot.processMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});
