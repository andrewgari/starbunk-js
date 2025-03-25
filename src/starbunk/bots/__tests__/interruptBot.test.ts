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
	});

	it('should have 1% response rate in normal mode', () => {
		expect(bot['responseRate']).toBe(1);
	});

	it('should interrupt when probability check passes', async () => {
		(percentChance as jest.Mock).mockReturnValue(true);
		await bot.handleMessage(mockMsg);

		expect(percentChance).toHaveBeenCalledWith(1);
		expect(sendReplySpy).toHaveBeenCalled();
	});

	it('should not interrupt when probability check fails', async () => {
		(percentChance as jest.Mock).mockReturnValue(false);
		await bot.handleMessage(mockMsg);

		expect(percentChance).toHaveBeenCalledWith(1);
		expect(sendReplySpy).not.toHaveBeenCalled();
	});

	it('should create interrupted message with first few words', async () => {
		(percentChance as jest.Mock).mockReturnValue(true);
		mockMsg.content = 'Did somebody say BLU?';
		await bot.handleMessage(mockMsg);

		expect(sendReplySpy).toHaveBeenCalled();
		expect(sendReplySpy).toHaveBeenCalledWith(
			expect.anything(),
			expect.stringContaining('Did somebody say')
		);
	});

	it('should create interrupted message with first few characters for single word', async () => {
		(percentChance as jest.Mock).mockReturnValue(true);
		mockMsg.content = 'Supercalifragilisticexpialidocious';
		await bot.handleMessage(mockMsg);

		expect(sendReplySpy).toHaveBeenCalled();
		expect(sendReplySpy).toHaveBeenCalledWith(
			expect.anything(),
			expect.stringContaining('Supercalif')
		);
	});
});
