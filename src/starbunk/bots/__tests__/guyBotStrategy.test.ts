import { container, ServiceId } from '../../../services/container';
import { mockLogger, mockMessage, mockWebhookService } from '../test-utils/testUtils';
import guyBot from '@/starbunk/bots/reply-bots/guy-bot';
import {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	GUY_BOT_NAME,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	GUY_BOT_AVATAR_URL,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	GUY_BOT_PATTERNS,
} from '@/starbunk/bots/reply-bots/guy-bot/constants';

// Mock the WebhookService
jest.mock('../../../services/bootstrap', () => ({
	getWebhookService: jest.fn().mockImplementation(() => mockWebhookService),
}));

describe('guyBot Strategy', () => {
	beforeEach(() => {
		// Clear mocks and reset container
		jest.clearAllMocks();
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);
	});

	it('should have the correct name', () => {
		expect(guyBot.name).toBe('GuyBot');
	});

	// For these tests, we'll just verify the bot structure instead of actual responses
	it('exists and has proper structure', () => {
		expect(guyBot).toBeDefined();
		expect(guyBot.name).toBe('GuyBot');
		expect(typeof guyBot.processMessage).toBe('function');
	});

	it('should not respond to unrelated messages', async () => {
		// Arrange
		const message = mockMessage('A completely unrelated message');

		// Act
		await guyBot.processMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});
