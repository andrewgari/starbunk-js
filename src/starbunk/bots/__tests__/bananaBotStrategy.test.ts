import { container, ServiceId } from '../../../services/container';
import bananaBot from '../strategy-bots/banana-bot';
import {
	BANANA_BOT_AVATAR_URL,
	BANANA_BOT_NAME,
	BANANA_BOT_RESPONSES
} from '../strategy-bots/banana-bot/constants';
import { mockLogger, mockMessage, mockWebhookService } from "../test-utils/testUtils";

// Mock the WebhookService
jest.mock('../../../services/bootstrap', () => ({
	getWebhookService: jest.fn().mockImplementation(() => mockWebhookService),
}));

describe('bananaBot Strategy', () => {
	beforeEach(() => {
		// Clear mocks and reset container
		jest.clearAllMocks();
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);
	});

	it('should have the correct name and description', () => {
		expect(bananaBot.name).toBe(BANANA_BOT_NAME);
		expect(bananaBot.description).toBe('Responds to banana mentions with random banana-related messages');
	});

	it('should respond to "banana" mentions', async () => {
		// Arrange
		const message = mockMessage('I like bananas');

		// Act
		await bananaBot.processMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).toHaveBeenCalledTimes(1);
		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				botName: BANANA_BOT_NAME,
				avatarUrl: BANANA_BOT_AVATAR_URL,
				content: expect.any(String)
			})
		);

		// Verify the response is one of the valid responses
		const response = mockWebhookService.writeMessage.mock.calls[0][1].content;
		expect(BANANA_BOT_RESPONSES).toContain(response);
	});

	it('should not respond to messages without banana mentions', async () => {
		// Arrange
		const message = mockMessage('I like apples');

		// Act
		await bananaBot.processMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});
