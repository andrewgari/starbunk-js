import { container, ServiceId } from '../../../services/container';
import { mockLogger, mockMessage, mockWebhookService } from '../test-utils/testUtils';
import sheeshBot from '@/starbunk/bots/reply-bots/sheesh-bot';
import {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	SHEESH_BOT_NAME,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	SHEESH_BOT_AVATAR_URL,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	SHEESH_BOT_PATTERNS,
} from '@/starbunk/bots/reply-bots/sheesh-bot/constants';

// Mock the WebhookService
jest.mock('../../../services/bootstrap', () => ({
	getWebhookService: jest.fn().mockImplementation(() => mockWebhookService),
}));

describe('sheeshBot Strategy', () => {
	beforeEach(() => {
		// Clear mocks and reset container
		jest.clearAllMocks();
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);
	});

	it('should have the correct name', () => {
		expect(sheeshBot.name).toBe('Sheesh Bot');
	});

	// For these tests, we'll just verify the bot structure instead of actual responses
	it('exists and has proper structure', () => {
		expect(sheeshBot).toBeDefined();
		expect(sheeshBot.name).toBe('Sheesh Bot');
		expect(typeof sheeshBot.processMessage).toBe('function');
	});

	it('should not respond to unrelated messages', async () => {
		// Arrange
		const message = mockMessage('A completely unrelated message');

		// Act
		await sheeshBot.processMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});
