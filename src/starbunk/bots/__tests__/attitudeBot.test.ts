import * as bootstrap from '../../../services/bootstrap';
import { container, ServiceId } from '../../../services/container';
import { AttitudeBotConfig } from '../config/attitudeBotConfig';
import AttitudeBot from '../reply-bots/attitudeBot';
import { mockDiscordService, mockLogger, mockMessage, mockWebhookService } from './testUtils';

// Mock the bootstrap module
jest.mock('../../../services/bootstrap', () => {
	return {
		getWebhookService: jest.fn().mockImplementation(() => mockWebhookService)
	};
});

jest.mock('../../../services/discordService', () => {
	return {
		DiscordService: {
			getInstance: jest.fn().mockImplementation(() => mockDiscordService)
		}
	};
});

describe('AttitudeBot', () => {
	let attitudeBot: AttitudeBot;

	beforeEach(() => {
		// Clear all mocks
		jest.clearAllMocks();

		// Clear container and register mocks
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);

		// Make sure bootstrap.getWebhookService returns our mock
		(bootstrap.getWebhookService as jest.Mock).mockReturnValue(mockWebhookService);

		// Setup mock Discord service
		mockDiscordService.getMemberAsBotIdentity.mockReturnValue({
			botName: AttitudeBotConfig.Name,
			avatarUrl: AttitudeBotConfig.Avatars.Default
		});

		// Create AttitudeBot instance
		attitudeBot = new AttitudeBot();
	});

	it('should respond to messages containing phrases like "I can\'t"', async () => {
		const message = mockMessage('I can\'t do this anymore');

		// Add a spy to the sendReply method
		const sendReplySpy = jest.spyOn(attitudeBot as any, 'sendReply');

		await attitudeBot.handleMessage(message);

		expect(sendReplySpy).toHaveBeenCalled();
		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				username: AttitudeBotConfig.Name,
				content: expect.any(String)
			})
		);
	});

	it('should not respond to bot messages', async () => {
		const message = mockMessage('I can\'t do this');
		message.author.bot = true;
		await attitudeBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should not respond to messages without negative attitude phrases', async () => {
		const message = mockMessage('hello world');
		await attitudeBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});
