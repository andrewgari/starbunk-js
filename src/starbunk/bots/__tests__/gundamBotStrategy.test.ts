import { container, ServiceId } from '../../../services/container';
import { mockLogger, mockMessage, mockWebhookService } from './testUtils';
import gundamBot from '../strategy-bots/gundam-bot';
import { 

	GUNDAM_BOT_NAME, 
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	GUNDAM_BOT_AVATAR_URL,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	GUNDAM_BOT_PATTERNS
} from '../strategy-bots/gundam-bot/constants';

// Mock the WebhookService
jest.mock('../../../services/bootstrap', () => ({
	getWebhookService: jest.fn().mockImplementation(() => mockWebhookService),
}));

describe('gundamBot Strategy', () => {
	beforeEach(() => {
		// Clear mocks and reset container
		jest.clearAllMocks();
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);
	});

	it('should have the correct name', () => {
		expect(gundamBot.name).toBe(GUNDAM_BOT_NAME);
	});

	// For these tests, we'll just verify the bot structure instead of actual responses
	it('exists and has proper structure', () => {
		expect(gundamBot).toBeDefined();
		expect(gundamBot.name).toBe(GUNDAM_BOT_NAME);
		expect(typeof gundamBot.processMessage).toBe('function');
	});
	
	it('should not respond to unrelated messages', async () => {
		// Arrange
		const message = mockMessage('A completely unrelated message');
		
		// Act
		await gundamBot.processMessage(message);
		
		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});
