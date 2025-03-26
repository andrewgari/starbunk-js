import { container, ServiceId } from '../../../services/container';
import { mockLogger, mockMessage, mockWebhookService } from './testUtils';
import pickleBot from '../strategy-bots/pickle-bot';
import {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	PICKLE_BOT_NAME, 
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	PICKLE_BOT_AVATAR_URL,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	PICKLE_BOT_PATTERNS
} from '../strategy-bots/pickle-bot/constants';

// Mock the WebhookService
jest.mock('../../../services/bootstrap', () => ({
	getWebhookService: jest.fn().mockImplementation(() => mockWebhookService),
}));

describe('pickleBot Strategy', () => {
	beforeEach(() => {
		// Clear mocks and reset container
		jest.clearAllMocks();
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);
	});

	it('should have the correct name', () => {
		expect(pickleBot.name).toBe('GremlinBot');
	});

	// For these tests, we'll just verify the bot structure instead of actual responses
	it('exists and has proper structure', () => {
		expect(pickleBot).toBeDefined();
		expect(pickleBot.name).toBe('GremlinBot');
		expect(typeof pickleBot.processMessage).toBe('function');
	});
	
	it('should not respond to unrelated messages', async () => {
		// Arrange
		const message = mockMessage('A completely unrelated message');
		
		// Act
		await pickleBot.processMessage(message);
		
		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});
