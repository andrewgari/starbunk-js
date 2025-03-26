import { Message } from 'discord.js';
import userId from '../../../discord/userId';
import { container, ServiceId } from '../../../services/container';
import { percentChance } from '../../../utils/random';
import VennBot from '../reply-bots/vennBot';
import { createMockMessage, mockLogger, mockWebhookService } from './testUtils';

// Mock DiscordService
jest.mock('../../../services/discordService', () => ({
	DiscordService: {
		getInstance: jest.fn().mockReturnValue({
			getBotProfile: jest.fn().mockReturnValue({
				botName: 'Venn',
				avatarUrl: 'https://example.com/venn.png'
			})
		})
	}
}));

jest.mock('../../../utils/random', () => ({
	percentChance: jest.fn()
}));

jest.mock('../../../environment', () => ({
	isDebugMode: jest.fn().mockReturnValue(false)
}));

describe('VennBot', () => {
	let bot: VennBot;
	let message: Message;
	let sendReplySpy: jest.SpyInstance;

	beforeEach(() => {
		// Arrange
		jest.clearAllMocks();
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);
		message = createMockMessage();
		bot = new VennBot();
		sendReplySpy = jest.spyOn(bot as any, 'sendReply').mockImplementation(() => Promise.resolve());
	});

	it('should have 5% response rate', () => {
		// Assert
		expect(bot['responseRate']).toBe(5);
	});

	it('should respond to cringe messages', async () => {
		// Arrange
		(percentChance as jest.Mock).mockReturnValue(false);
		message.content = 'venn is cringe';
		
		// Act
		await bot.handleMessage(message);

		// Assert
		expect(sendReplySpy).toHaveBeenCalled();
	});

	it('should respond to Venn when probability check passes', async () => {
		// Arrange
		(percentChance as jest.Mock).mockReturnValue(true);
		message.author.id = userId.Venn;
		
		// Act
		await bot.handleMessage(message);

		// Assert
		expect(percentChance).toHaveBeenCalledWith(5);
		expect(sendReplySpy).toHaveBeenCalled();
	});

	it('should not respond to Venn when probability check fails', async () => {
		// Arrange
		(percentChance as jest.Mock).mockReturnValue(false);
		message.author.id = userId.Venn;
		
		// Act
		await bot.handleMessage(message);

		// Assert
		expect(percentChance).toHaveBeenCalledWith(5);
		expect(sendReplySpy).not.toHaveBeenCalled();
	});
});
