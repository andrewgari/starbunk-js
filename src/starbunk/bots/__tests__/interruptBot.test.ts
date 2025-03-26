import { Message } from 'discord.js';
import { ServiceId, container } from '../../../services/container';
import { percentChance } from '../../../utils/random';
import InterruptBot from '../reply-bots/interruptBot';
import { createMockMessage, mockLogger, mockWebhookService } from './testUtils';

// Mock Random module
jest.mock('../../../utils/random', () => ({
	percentChance: jest.fn()
}));

// Mock environment module
jest.mock('../../../environment', () => ({
	isDebugMode: jest.fn().mockReturnValue(false)
}));

describe('InterruptBot', () => {
	let bot: InterruptBot;
	let message: Message;
	let sendReplySpy: jest.SpyInstance;

	beforeEach(() => {
		// Arrange
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);
		jest.clearAllMocks();
		message = createMockMessage();
		bot = new InterruptBot();
		sendReplySpy = jest.spyOn(bot as any, 'sendReply').mockImplementation(() => Promise.resolve());
	});

	it('should have 1% response rate in normal mode', () => {
		// Assert
		expect(bot['responseRate']).toBe(1);
	});

	it('should interrupt when probability check passes', async () => {
		// Arrange
		(percentChance as jest.Mock).mockReturnValue(true);
		
		// Act
		await bot.handleMessage(message);

		// Assert
		expect(percentChance).toHaveBeenCalledWith(1);
		expect(sendReplySpy).toHaveBeenCalled();
	});

	it('should not interrupt when probability check fails', async () => {
		// Arrange
		(percentChance as jest.Mock).mockReturnValue(false);
		
		// Act
		await bot.handleMessage(message);

		// Assert
		expect(percentChance).toHaveBeenCalledWith(1);
		expect(sendReplySpy).not.toHaveBeenCalled();
	});

	it('should create interrupted message with first few words', async () => {
		// Arrange
		(percentChance as jest.Mock).mockReturnValue(true);
		message.content = 'Did somebody say BLU?';
		
		// Act
		await bot.handleMessage(message);

		// Assert
		expect(sendReplySpy).toHaveBeenCalledWith(
			expect.anything(),
			expect.stringContaining('Did somebody say')
		);
	});
});
