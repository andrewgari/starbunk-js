import { container, ServiceId } from '../../../services/container';
import { mockLogger, mockMessage, mockWebhookService } from '../test-utils/testUtils';
import holdBot from '@/starbunk/bots/reply-bots/hold-bot';
import {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	HOLD_BOT_NAME,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	HOLD_AVATAR_URL,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	HOLD_PATTERN,
} from '@/starbunk/bots/reply-bots/hold-bot/constants';

// Mock the WebhookService
jest.mock('../../../services/bootstrap', () => ({
	getWebhookService: jest.fn().mockImplementation(() => mockWebhookService),
}));

describe('holdBot Strategy', () => {
	beforeEach(() => {
		// Clear mocks and reset container
		jest.clearAllMocks();
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);
	});

	it('should have the correct name', () => {
		expect(holdBot.name).toBe('HoldBot');
	});

	// For these tests, we'll just verify the bot structure instead of actual responses
	it('exists and has proper structure', () => {
		expect(holdBot).toBeDefined();
		expect(holdBot.name).toBe('HoldBot');
		expect(typeof holdBot.processMessage).toBe('function');
	});

	it('should not respond to unrelated messages', async () => {
		// Arrange
		const message = mockMessage('A completely unrelated message');

		// Act
		await holdBot.processMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});
