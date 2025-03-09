// Mock the BlueBotConfig
jest.mock('../config/blueBotConfig', () => ({
	BlueBotConfig: {
		Name: 'BluBot',
		Avatars: {
			Default: 'https://imgur.com/WcBRCWn.png',
			Murder: 'https://imgur.com/Tpo8Ywd.jpg',
			Cheeky: 'https://i.imgur.com/dO4a59n.png'
		},
		Patterns: {
			Default: /\b(blu|blue|bl(o+)|azul|blau|bl(u+)|blew|bl\u00f6|\u0441\u0438\u043d\u0438\u0439|\u9752|\u30d6\u30eb\u30fc|\ube14\uB8E8|\u05DB\u05D7\u05D5\u05DC|\u0928\u0940\u0932\u093E|\u84DD)\b/i,
			Confirm: /\b(blue?(bot)?)|(bot)|yes|no|yep|yeah|(i did)|(you got it)|(sure did)\b/i,
			Nice: /blue?bot,? say something nice about (?<n>.+$)/i,
			Mean: /\b(fuck(ing)?|hate|die|kill|worst|mom|shit|murder|bots?)\b/i
		},
		Responses: {
			Default: 'Did somebody say Blu?',
			Cheeky: 'Lol, Somebody definitely said Blu! :smile:',
			Murder: "What the fuck did you just fucking say about me...",
			Request: jest.fn().mockImplementation((message) => {
				if (message.includes('Venn')) {
					return 'No way, Venn can suck my blu cane. :unamused:';
				} else if (message.includes('Andrew')) {
					return 'Andrew, I think you\'re pretty Blu! :wink: :blue_heart:';
				} else {
					return 'Hey, I think you\'re pretty Blu! :wink: :blue_heart:';
				}
			})
		}
	}
}));

import { Message } from 'discord.js';
import userID from '../../../discord/userId';
import { OpenAIClient } from '../../../openai/openaiClient';
import { getWebhookService } from '../../../services/bootstrap';
import { BlueBotConfig } from '../config/blueBotConfig';
import BlueBot from '../reply-bots/blueBot';
import { MockWebhookService, createMockMessage } from './testUtils';

jest.mock('../../../services/bootstrap');
jest.mock('../../../services/container');

// Mock OpenAI client
jest.mock('../../../openai/openaiClient', () => ({
	OpenAIClient: {
		chat: {
			completions: {
				create: jest.fn()
			}
		}
	}
}));

describe('BlueBot', () => {
	let blueBot: BlueBot;
	let mockWebhookService: MockWebhookService;

	beforeEach(() => {
		mockWebhookService = new MockWebhookService();
		(getWebhookService as jest.Mock).mockReturnValue(mockWebhookService);
		blueBot = new BlueBot();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should respond to messages containing "blue"', async () => {
		const message = createMockMessage('I love blue!') as Message;
		await blueBot.handleMessage(message);
		expect(mockWebhookService.messages.length).toBe(1);
		const lastMessage = mockWebhookService.getLastMessage();
		expect(lastMessage?.content).toBe(BlueBotConfig.Responses.Default);
		expect(lastMessage?.username).toBe(BlueBotConfig.Name);
	});

	it('should not respond to bot messages', async () => {
		const message = createMockMessage('blue', undefined, true) as Message;
		await blueBot.handleMessage(message);
		expect(mockWebhookService.messages.length).toBe(0);
	});

	it('should not respond to messages without "blue"', async () => {
		const message = createMockMessage('hello world') as Message;
		await blueBot.handleMessage(message);
		expect(mockWebhookService.messages.length).toBe(0);
	});

	it('should respond when someone says "blue"', async () => {
		// Arrange
		const message = createMockMessage('I like the color blue');

		// Act
		await blueBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				username: 'BluBot',
				content: 'Did somebody say Blu?'
			})
		);
	});

	it('should acknowledge that somebody said blue', async () => {
		// Arrange
		const message = createMockMessage('blue');

		// set the blue timestamp to 1 minute ago
		// @ts-expect-error - Access private property for test
		blueBot._blueTimestamp = new Date(Date.now() - 60000);

		// Act
		await blueBot.handleMessage(message);
	});

	it('should respond to "be nice about" requests', async () => {
		// Arrange
		const message = createMockMessage('bluebot, say something nice about Andrew');

		// Act
		await blueBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				content: expect.stringContaining('Andrew, I think you\'re pretty Blu!'),
				username: 'BluBot'
			})
		);
	});

	it('should reject being nice about Venn', async () => {
		// Arrange
		const message = createMockMessage('bluebot, say something nice about Venn');

		// Act
		await blueBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				content: 'No way, Venn can suck my blu cane. :unamused:',
				username: 'BluBot'
			})
		);
	});

	it('should respond with Navy Seal copypasta when Venn is insulting Blu', async () => {
		// Arrange
		// Mock timestamps for the timing condition check
		const mockDate = new Date();
		jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

		// Mock the private method using prototype
		// @ts-expect-error - Access private method for test
		jest.spyOn(BlueBot.prototype, 'isVennInsultingBlu').mockReturnValue(true);

		const message = createMockMessage('Fuck this blue bot', userID.Venn);

		// Act
		await blueBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				username: 'BluBot',
				content: expect.stringContaining("What the fuck did you just fucking say about me")
			})
		);
	});

	it('should respond when AI detects a blue reference', async () => {
		// Arrange
		const message = createMockMessage('The sky is looking nice today');

		// Mock the OpenAI response
		const mockOpenAIResponse = {
			choices: [
				{
					message: {
						content: 'yes'
					}
				}
			]
		};
		(OpenAIClient.chat.completions.create as jest.Mock).mockResolvedValue(mockOpenAIResponse);

		// Act
		await blueBot.handleMessage(message);

		// Assert
		expect(OpenAIClient.chat.completions.create).toHaveBeenCalled();
		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				username: 'BluBot',
				content: 'Did somebody say Blu?'
			})
		);
	});
});
