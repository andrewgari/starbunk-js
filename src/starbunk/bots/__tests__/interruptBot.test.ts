import { Message } from 'discord.js';
import * as environment from '../../../environment';
import { ServiceId, container } from '../../../services/container';
import Random from '../../../utils/random';
import InterruptBot from '../reply-bots/interruptBot';
import { createMockMessage, mockLogger, mockWebhookService } from './testUtils';

// Mock Random module
jest.mock('../../../utils/random', () => ({
	percentChance: jest.fn().mockReturnValue(false),
	roll: jest.fn()
}));

// Mock environment module
jest.mock('../../../environment', () => ({
	isDebugMode: jest.fn().mockReturnValue(false),
	setDebugMode: jest.fn()
}));

describe('InterruptBot', () => {
	let bot: InterruptBot;
	let mockMsg: Message;
	let sendReplySpy: jest.SpyInstance;

	beforeEach(() => {
		// Clear container and register mocks
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);

		// Reset mocks
		jest.clearAllMocks();

		// Create a mock message
		mockMsg = createMockMessage();

		// Initialize the bot
		bot = new InterruptBot();

		// Spy on the sendReply method
		sendReplySpy = jest.spyOn(bot as any, 'sendReply').mockImplementation(() => Promise.resolve());

		// Default to debug mode off
		(environment.isDebugMode as jest.Mock).mockReturnValue(false);
	});

	it('should interrupt if percentChance returns true', async () => {
		// Arrange
		(Random.percentChance as jest.Mock).mockReturnValueOnce(true);

		// Act
		await bot.handleMessage(mockMsg);

		// Assert
		expect(sendReplySpy).toHaveBeenCalled();
	});

	it('should not trigger if percentChance returns false', async () => {
		// Arrange
		(Random.percentChance as jest.Mock).mockReturnValueOnce(false);

		// Act
		await bot.handleMessage(mockMsg);

		// Assert
		expect(sendReplySpy).not.toHaveBeenCalled();
	});

	it('should create interrupted message with first few words', async () => {
		// Arrange
		(Random.percentChance as jest.Mock).mockReturnValueOnce(true);
		mockMsg.content = 'Did somebody say BLU?';

		// Act
		await bot.handleMessage(mockMsg);

		// Assert
		expect(sendReplySpy).toHaveBeenCalled();
		expect(sendReplySpy).toHaveBeenCalledWith(
			expect.anything(),
			expect.stringContaining('Did somebody say')
		);
	});

	it('should create interrupted message with first few characters for single word', async () => {
		// Arrange
		(Random.percentChance as jest.Mock).mockReturnValueOnce(true);
		mockMsg.content = 'Supercalifragilisticexpialidocious';

		// Act
		await bot.handleMessage(mockMsg);

		// Assert
		expect(sendReplySpy).toHaveBeenCalled();
		expect(sendReplySpy).toHaveBeenCalledWith(
			expect.anything(),
			expect.stringContaining('Supercalif')
		);
	});
});
