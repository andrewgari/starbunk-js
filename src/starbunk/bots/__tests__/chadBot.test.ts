import { container } from '../../../services/container';
import { ChadBotConfig } from '../config/chadBotConfig';
import ChadBot from '../reply-bots/chadBot';
import { mockDiscordService, mockMessage, mockWebhookService, setupBotTest } from './testUtils';

// Minimal required mocks
jest.mock('../../../services/bootstrap', () => ({
	getWebhookService: jest.fn(() => mockWebhookService),
	getDiscordService: jest.fn(() => mockDiscordService)
}));

jest.mock('../../../services/discordService', () => ({
	DiscordService: {
		getInstance: jest.fn(() => mockDiscordService)
	}
}));

describe('ChadBot', () => {
	let chadBot: ChadBot;

	beforeEach(() => {
		// Arrange: Setup test environment
		setupBotTest(container, {
			botName: ChadBotConfig.Name,
			avatarUrl: ChadBotConfig.Avatars.Default
		});

		// Set up getBotProfile for ChadBot specifically
		mockDiscordService.getBotProfile.mockReturnValue({
			botName: ChadBotConfig.Name,
			avatarUrl: ChadBotConfig.Avatars.Default
		});

		chadBot = new ChadBot();
	});

	it('should have 1% response rate', () => {
		// Arrange (done in beforeEach)

		// Act - Get the response rate
		const responseRate = chadBot.getResponseRate();

		// Assert
		expect(responseRate).toBe(1);
	});

	it('should send default response when triggered', async () => {
		// Arrange
		const message = mockMessage('Hello everyone');
		jest.spyOn(chadBot as any, 'shouldTriggerResponse').mockReturnValue(true);

		// Act
		await chadBot.handleMessage(message);

		// Assert
		expect(mockDiscordService.sendMessageWithBotIdentity).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ botName: ChadBotConfig.Name }),
			ChadBotConfig.Responses.Default
		);
	});

	it('should not respond when random chance fails', async () => {
		// Arrange
		const message = mockMessage('Hello everyone');
		jest.spyOn(chadBot as any, 'shouldTriggerResponse').mockReturnValue(false);

		// Act
		await chadBot.handleMessage(message);

		// Assert
		expect(mockDiscordService.sendMessageWithBotIdentity).not.toHaveBeenCalled();
	});

	it('should skip bot messages', async () => {
		// Arrange
		const botMessage = mockMessage('Hello', 'testBot', true);

		// Act
		await chadBot.handleMessage(botMessage);

		// Assert
		expect(mockDiscordService.sendMessageWithBotIdentity).not.toHaveBeenCalled();
	});

	it('should use fallback identity when getBotProfile fails', async () => {
		// Arrange
		mockDiscordService.getBotProfile.mockImplementationOnce(() => {
			throw new Error('Profile error');
		});

		// Act
		const identity = chadBot.botIdentity;

		// Assert
		expect(identity).toEqual({
			botName: ChadBotConfig.Name,
			avatarUrl: ChadBotConfig.Avatars.Default
		});
	});
});
