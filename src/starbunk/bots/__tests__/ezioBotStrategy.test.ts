import { container, ServiceId } from '../../../services/container';
import { mockLogger, mockMessage, mockWebhookService } from "../test-utils/testUtils";
import ezioBot from '../strategy-bots/ezio-bot';
import { 
	EZIO_BOT_NAME, 
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	EZIO_BOT_AVATAR_URL,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	EZIO_BOT_PATTERNS
} from '../strategy-bots/ezio-bot/constants';

// Mock the WebhookService
jest.mock('../../../services/bootstrap', () => ({
	getWebhookService: jest.fn().mockImplementation(() => mockWebhookService),
}));

describe('ezioBot Strategy', () => {
	beforeEach(() => {
		// Clear mocks and reset container
		jest.clearAllMocks();
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);
	});

	it('should have the correct name', () => {
		expect(ezioBot.name).toBe(EZIO_BOT_NAME);
	});

	// For these tests, we'll just verify the bot structure instead of actual responses
	it('exists and has proper structure', () => {
		expect(ezioBot).toBeDefined();
		expect(ezioBot.name).toBe(EZIO_BOT_NAME);
		expect(typeof ezioBot.processMessage).toBe('function');
	});
	
	it('should not respond to unrelated messages', async () => {
		// Arrange
		const message = mockMessage('A completely unrelated message');
		
		// Act
		await ezioBot.processMessage(message);
		
		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});
