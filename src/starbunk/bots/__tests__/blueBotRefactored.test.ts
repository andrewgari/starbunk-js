// Mocks should be before imports
jest.mock('../../../webhooks/webhookService');

// Mock userID
jest.mock('../../../discord/userID', () => ({
	default: {
		Venn: 'venn123'
	}
}));

// Mock the OpenAIClient
const mockOpenAIClient = {
	chat: {
		completions: {
			create: jest.fn().mockResolvedValue({
				choices: [{ message: { content: 'yes' } }]
			})
		}
	}
};

// Now the imports
import { ILogger } from '../../../services/Logger';
import { mockLogger } from './testUtils';
import container from '../../../services/ServiceContainer';
import { ServiceRegistry } from '../../../services/ServiceRegistry';
import { IWebhookService } from '../../../webhooks/webhookService';
import BlueBotRefactored from '../reply-bots/blueBotRefactored';
import { mockMessage } from './testUtils';
import { getBotPattern } from '../botConstants';

// Mock the bot constants
jest.mock('../botConstants', () => ({
	getBotName: jest.fn().mockReturnValue('BlueBot'),
	getBotAvatar: jest.fn().mockReturnValue('http://example.com/blue.jpg'),
	getBotPattern: jest.fn().mockImplementation((bot, type) => {
		if (bot === 'Blue') {
			if (type === 'Default') return /blue/i;
			if (type === 'Nice') return /be nice blue/i;
			if (type === 'Mean') return /blue sucks/i;
			if (type === 'Confirm') return /yes blue/i;
		}
		return null;
	}),
	getBotResponse: jest.fn().mockReturnValue('Blue!')
}));

describe('BlueBotRefactored with DI', () => {
	let blueBot: BlueBotRefactored;
	let mockWebhookService: IWebhookService;

	beforeEach(() => {
		jest.clearAllMocks();

		// Clear the DI container
		container.clear();

		// Create mock services
		mockWebhookService = {
			writeMessage: jest.fn().mockResolvedValue({}),
			getChannelWebhook: jest.fn().mockResolvedValue({}),
			getWebhook: jest.fn().mockResolvedValue({})
		};

		// Register mock services with the container
		container.register(ServiceRegistry.LOGGER, mockLogger);
		container.register(ServiceRegistry.WEBHOOK_SERVICE, mockWebhookService);

		// Create bot instance with direct dependency injection
		blueBot = new BlueBotRefactored(
			mockLogger,
			mockWebhookService,
			mockOpenAIClient as any
		);

		// Mock the sendReply method
		jest.spyOn(blueBot, 'sendReply').mockImplementation(() => Promise.resolve());
	});

	test('should not respond to bot messages', async () => {
		const botMessage = mockMessage('blue');
		botMessage.author.bot = true;

		await blueBot.handleMessage(botMessage);

		expect(blueBot.sendReply).not.toHaveBeenCalled();
	});

	test('should respond to messages containing "blue"', async () => {
		const message = mockMessage('blue');
		
		// Ensure pattern will match for this test
		(getBotPattern as jest.Mock).mockImplementation((bot, type) => {
			if (bot === 'Blue' && type === 'Default') return /blue/i;
			return null;
		});

		await blueBot.handleMessage(message);

		expect(blueBot.sendReply).toHaveBeenCalled();
	});

	test('should use AI to detect blue references', async () => {
		// Force pattern to not match initially so it goes to AI check
		(getBotPattern as jest.Mock).mockImplementation(() => null);
		
		const message = mockMessage('the sky is a nice color');
		
		await blueBot.handleMessage(message);
		
		expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalled();
		expect(blueBot.sendReply).toHaveBeenCalled();
	});
	
	test('should respond to Venn insulting blue', async () => {
		// Mock to make isVennInsultingBlu return true
		const message = mockMessage('blue sucks');
		message.author.id = 'venn123';
		
		// Set timestamps to trigger the condition
		// 1 minute ago
		(blueBot as any).blueTimestamp = new Date(Date.now() - 60 * 1000);
		// 25 hours ago
		(blueBot as any).blueMurderTimestamp = new Date(Date.now() - 25 * 60 * 60 * 1000);
		
		// Make sure getBotPattern returns the right pattern for this test
		(getBotPattern as jest.Mock).mockImplementation((bot, type) => {
			if (bot === 'Blue' && type === 'Mean') return /blue sucks/i;
			return null;
		});
		
		await blueBot.handleMessage(message);
		
		expect(blueBot.sendReply).toHaveBeenCalled();
	});
});