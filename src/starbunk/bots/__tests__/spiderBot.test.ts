import * as bootstrap from '../../../services/bootstrap';
import { container, ServiceId } from '../../../services/container';
import { SpiderBotConfig } from '../config/spiderBotConfig';
import SpiderBot from '../reply-bots/spiderBot';
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

describe('SpiderBot', () => {
	let spiderBot: SpiderBot;

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
			botName: SpiderBotConfig.Name,
			avatarUrl: SpiderBotConfig.Avatars.Default
		});

		// Create SpiderBot instance
		spiderBot = new SpiderBot();
	});

	it('should respond to messages containing "spiderman"', async () => {
		const message = mockMessage('I saw spiderman today');
		await spiderBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				username: SpiderBotConfig.Name,
				content: expect.any(String)
			})
		);
	});

	it('should respond with correction to incorrect Spider-Man spelling', async () => {
		const message = mockMessage('I love spiderman!');
		await spiderBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				username: SpiderBotConfig.Name,
				content: expect.any(String)
			})
		);
	});

	it('should respond positively to correct Spider-Man spelling', async () => {
		const message = mockMessage('Spider-Man is awesome!');
		await spiderBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				username: SpiderBotConfig.Name,
				content: expect.any(String)
			})
		);
	});

	it('should not respond to bot messages', async () => {
		const message = mockMessage('spiderman', undefined, true);
		message.author.bot = true;
		await spiderBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should not respond to messages without spider-man reference', async () => {
		const message = mockMessage('hello world');
		await spiderBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});
