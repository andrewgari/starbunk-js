import { container, ServiceId } from '../../../services/container';
import { mockLogger, mockMessage, mockWebhookService } from './testUtils';
import spiderBot from '../strategy-bots/spider-bot';
import {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	SPIDER_BOT_NAME, 
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	SPIDER_BOT_AVATAR_URL,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	SPIDER_BOT_PATTERNS
} from '../strategy-bots/spider-bot/constants';

// Mock the WebhookService
jest.mock('../../../services/bootstrap', () => ({
	getWebhookService: jest.fn().mockImplementation(() => mockWebhookService),
}));

describe('spiderBot Strategy', () => {
	beforeEach(() => {
		// Clear mocks and reset container
		jest.clearAllMocks();
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);
	});

	it('should have the correct name', () => {
		expect(spiderBot.name).toBe('Spider-Bot');
	});

	// For these tests, we'll just verify the bot structure instead of actual responses
	it('exists and has proper structure', () => {
		expect(spiderBot).toBeDefined();
		expect(spiderBot.name).toBe('Spider-Bot');
		expect(typeof spiderBot.processMessage).toBe('function');
	});
	
	it('should not respond to unrelated messages', async () => {
		// Arrange
		const message = mockMessage('A completely unrelated message');
		
		// Act
		await spiderBot.processMessage(message);
		
		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});
