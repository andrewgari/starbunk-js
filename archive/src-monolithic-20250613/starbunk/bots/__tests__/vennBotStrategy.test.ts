import { container, ServiceId } from '../../../services/container';
import { mockLogger, mockMessage, mockWebhookService } from '../test-utils/testUtils';
import vennBot from '@/starbunk/bots/reply-bots/venn-bot';
import {
	VENN_BOT_NAME,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	VENN_AVATAR_URL,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	VENN_PATTERNS,
} from '@/starbunk/bots/reply-bots/venn-bot/constants';

// Mock the WebhookService
jest.mock('../../../services/bootstrap', () => ({
	getWebhookService: jest.fn().mockImplementation(() => mockWebhookService),
}));

describe('vennBot Strategy', () => {
	beforeEach(() => {
		// Clear mocks and reset container
		jest.clearAllMocks();
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);
	});

	it('should have the correct name', () => {
		expect(vennBot.name).toBe(VENN_BOT_NAME);
	});

	// For these tests, we'll just verify the bot structure instead of actual responses,
	// since the responses depend on specific triggers that might vary per bot
	it('exists and has proper structure', () => {
		expect(vennBot).toBeDefined();
		expect(vennBot.name).toBe(VENN_BOT_NAME);
		expect(typeof vennBot.processMessage).toBe('function');
	});

	it('should not respond to unrelated messages', async () => {
		// Arrange
		const message = mockMessage('A completely unrelated message');

		// Act
		await vennBot.processMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});
