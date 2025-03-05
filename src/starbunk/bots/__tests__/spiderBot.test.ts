// Mock the webhook service
jest.mock('../../../webhooks/webhookService');

// Mock the bot constants
jest.mock('../botConstants', () => ({
	getBotName: jest.fn().mockReturnValue('SpiderBot'),
	getBotAvatar: jest.fn().mockReturnValue('http://example.com/spider.jpg'),
	getBotPattern: jest.fn().mockReturnValue(/\bspider\b/i),
	getBotResponse: jest.fn().mockReturnValue('🕷️'),
}));

import webhookService from '../../../webhooks/webhookService';
import SpiderBot from '../reply-bots/spiderBot';
import { mockMessage } from './testUtils';

// Set up the mock implementation
// The setupBotMocks() function in testUtils now handles this

describe('SpiderBot', () => {
	let spiderBot: SpiderBot;

	beforeEach(() => {
		jest.clearAllMocks();
		spiderBot = new SpiderBot();
	});

	test('should not respond to bot messages', async () => {
		// Arrange
		const botMessage = mockMessage('I saw a spider today');
		botMessage.author.bot = true;

		// Act
		await spiderBot.handleMessage(botMessage);

		// Assert
		expect(webhookService.writeMessage).not.toHaveBeenCalled();
	});

	test('should respond to messages containing "spider"', async () => {
		// Arrange
		const message = mockMessage('I saw a spider today');

		// Act
		await spiderBot.handleMessage(message);

		// Assert
		expect(webhookService.writeMessage).toHaveBeenCalled();
	});
});
