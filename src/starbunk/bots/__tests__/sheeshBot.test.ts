import { container, ServiceId } from '../../../services/container';
import { DiscordService } from '../../../services/discordService';
import SheeshBot from '../reply-bots/sheeshBot';
import { mockLogger, mockMessage, mockWebhookService } from './testUtils';

// Mock the DiscordService
jest.mock('../../../services/discordService', () => ({
	DiscordService: {
		getInstance: jest.fn().mockReturnValue({
			getRandomBotProfile: jest.fn().mockReturnValue({
				botName: 'Sheesh Bot',
				avatarUrl: 'https://example.com/sheesh.jpg'
			}),
			sendMessageWithBotIdentity: jest.fn().mockResolvedValue(undefined)
		})
	}
}));

describe('SheeshBot', () => {
	let bot: SheeshBot;
	let discordServiceMock: any;

	beforeEach(() => {
		// Arrange
		jest.clearAllMocks();
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);
		discordServiceMock = DiscordService.getInstance();
		bot = new SheeshBot();
	});

	it('should respond to messages containing "sheesh"', async () => {
		// Arrange
		const message = mockMessage('sheesh that was amazing');

		// Act
		await bot.handleMessage(message);

		// Assert
		expect(discordServiceMock.sendMessageWithBotIdentity).toHaveBeenCalledWith(
			message.channel.id,
			expect.anything(),
			expect.any(String)
		);
	});

	it('should not respond to bot messages', async () => {
		// Arrange
		const message = mockMessage('sheesh', undefined, true);

		// Act
		await bot.handleMessage(message);

		// Assert
		expect(discordServiceMock.sendMessageWithBotIdentity).not.toHaveBeenCalled();
	});

	it('should not respond to messages without "sheesh"', async () => {
		// Arrange
		const message = mockMessage('hello world');

		// Act
		await bot.handleMessage(message);

		// Assert
		expect(discordServiceMock.sendMessageWithBotIdentity).not.toHaveBeenCalled();
	});

	it('should respond to messages containing "sheeeeesh"', async () => {
		// Arrange
		const message = mockMessage('sheeeeesh, what happened?');

		// Act
		await bot.handleMessage(message);

		// Assert
		expect(discordServiceMock.sendMessageWithBotIdentity).toHaveBeenCalled();
	});

	it('should not match "sheesh" within other words', async () => {
		// Arrange
		const message = mockMessage('asheeshb');  // "sheesh" inside a word

		// Act
		await bot.handleMessage(message);

		// Assert
		expect(discordServiceMock.sendMessageWithBotIdentity).not.toHaveBeenCalled();
	});

	it('should not respond to messages partially matching "shsh"', async () => {
		// Arrange
		const message = mockMessage('shsh');

		// Act
		await bot.handleMessage(message);

		// Assert
		expect(discordServiceMock.sendMessageWithBotIdentity).not.toHaveBeenCalled();
	});

	it('should respond with messages containing "sheesh"', async () => {
		// Arrange
		const message = mockMessage('sheesh');

		// Act
		await bot.handleMessage(message);

		// Assert
		expect(discordServiceMock.sendMessageWithBotIdentity).toHaveBeenCalledWith(
			message.channel.id,
			expect.anything(),
			expect.stringMatching(/\bshee+sh\b/i)
		);
	});
});
