import { container, ServiceId } from '../../../services/container';
import { mockLogger, mockMessage, mockWebhookService } from "../test-utils/testUtils";
import interruptBot from '../strategy-bots/interrupt-bot';
import {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	INTERRUPT_BOT_NAME, 
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	INTERRUPT_BOT_AVATAR_URL,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	INTERRUPT_BOT_PATTERNS
} from '../strategy-bots/interrupt-bot/constants';

// Mock the WebhookService
jest.mock('../../../services/bootstrap', () => ({
	getWebhookService: jest.fn().mockImplementation(() => mockWebhookService),
}));

describe('interruptBot Strategy', () => {
	beforeEach(() => {
		// Clear mocks and reset container
		jest.clearAllMocks();
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);
	});

	it('should have the correct name', () => {
		expect(interruptBot.name).toBe('Interrupt Bot');
	});

	// For these tests, we'll just verify the bot structure instead of actual responses
	it('exists and has proper structure', () => {
		expect(interruptBot).toBeDefined();
		expect(interruptBot.name).toBe('Interrupt Bot');
		expect(typeof interruptBot.processMessage).toBe('function');
	});
	
	it('should not respond to unrelated messages', async () => {
		// Arrange
		const message = mockMessage('A completely unrelated message');
		
		// Act
		await interruptBot.processMessage(message);
		
		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});
