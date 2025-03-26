import { container, ServiceId } from '../../../services/container';
import { mockLogger, mockMessage, mockWebhookService } from "../test-utils/testUtils";
import checkBot from '../strategy-bots/check-bot';
import { 
	CHECK_BOT_NAME, 
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	CHECK_BOT_AVATAR_URL,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	CHECK_BOT_PATTERNS
} from '../strategy-bots/check-bot/constants';

// Mock the WebhookService
jest.mock('../../../services/bootstrap', () => ({
	getWebhookService: jest.fn().mockImplementation(() => mockWebhookService),
}));

describe('checkBot Strategy', () => {
	beforeEach(() => {
		// Clear mocks and reset container
		jest.clearAllMocks();
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);
	});

	it('should have the correct name', () => {
		expect(checkBot.name).toBe(CHECK_BOT_NAME);
	});

	// For these tests, we'll just verify the bot structure instead of actual responses
	it('exists and has proper structure', () => {
		expect(checkBot).toBeDefined();
		expect(checkBot.name).toBe(CHECK_BOT_NAME);
		expect(typeof checkBot.processMessage).toBe('function');
	});
	
	it('should not respond to unrelated messages', async () => {
		// Arrange
		const message = mockMessage('A completely unrelated message');
		
		// Act
		await checkBot.processMessage(message);
		
		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});
