import { container, ServiceId } from '../../../services/container';
import { mockLogger, mockMessage, mockWebhookService } from '../test-utils/testUtils';
import babyBot from '@/starbunk/bots/reply-bots/baby-bot';
import {
	BABY_BOT_NAME,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	BABY_BOT_AVATAR_URL,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	BABY_BOT_PATTERNS,
} from '@/starbunk/bots/reply-bots/baby-bot/constants';

// Mock the WebhookService
jest.mock('../../../services/bootstrap', () => ({
	getWebhookService: jest.fn().mockImplementation(() => mockWebhookService),
}));

describe('babyBot Strategy', () => {
	beforeEach(() => {
		// Clear mocks and reset container
		jest.clearAllMocks();
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);
	});

	it('should have the correct name', () => {
		expect(babyBot.name).toBe(BABY_BOT_NAME);
	});

	// For these tests, we'll just verify the bot structure instead of actual responses
	it('exists and has proper structure', () => {
		expect(babyBot).toBeDefined();
		expect(babyBot.name).toBe(BABY_BOT_NAME);
		expect(typeof babyBot.processMessage).toBe('function');
	});

	it('should not respond to unrelated messages', async () => {
		// Arrange
		const message = mockMessage('A completely unrelated message');

		// Act
		await babyBot.processMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});
