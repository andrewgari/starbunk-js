// Mocks should be before imports
jest.mock('../../../webhooks/webhookService');

// Mock userID
jest.mock('../../../discord/userID', () => ({
	default: {
		Venn: 'venn123'
	}
}));

// Mock the OpenAIClient
jest.mock('../../../openai/openaiClient', () => ({
	OpenAIClient: {
		chat: {
			completions: {
				create: jest.fn().mockResolvedValue({
					choices: [{ message: { content: 'yes' } }]
				})
			}
		}
	}
}));

// Now the imports
import { OpenAIClient } from '../../../openai/openaiClient';
import { getBotPattern } from '../botConstants';
import BlueBot from '../reply-bots/blueBot';
import { mockMessage, setupBotMocks, setupTestContainer } from './testUtils';

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

describe('BlueBot', () => {
	let blueBot: BlueBot;

	beforeEach(() => {
		jest.clearAllMocks();
		// Set up container with mock services
		setupTestContainer();
		// Reset and set up bot-specific mocks
		setupBotMocks();
		// Create bot after setting up container
		blueBot = new BlueBot();

		// Mock the sendReply method to use our mocked webhook
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
		// Mock the AI completion call to respond with "yes"
		const mockCompletionCreate = jest.fn().mockResolvedValue({
			choices: [{ message: { content: 'yes' } }]
		});

		// Replace the OpenAI API call with our mock
		jest.spyOn(OpenAIClient.chat.completions, 'create').mockImplementation(mockCompletionCreate);

		const message = mockMessage('the sky is a nice color');

		// Make sure all patterns fail to match so it falls through to the AI check
		(getBotPattern as jest.Mock).mockImplementation(() => null);

		// Set up private method spy
		const checkSpy = jest.spyOn(blueBot as any, 'checkIfBlueIsSaid');

		await blueBot.handleMessage(message);

		expect(checkSpy).toHaveBeenCalled();
		expect(mockCompletionCreate).toHaveBeenCalled();
		expect(blueBot.sendReply).toHaveBeenCalled();
	});

	test('should respond to Venn insulting blue', async () => {
		// Mock to make isVennInsultingBlu return true
		const message = mockMessage('blue sucks');
		message.author.id = 'venn123';

		// Set timestamps to trigger the condition
		(blueBot as any).blueTimestamp = new Date(Date.now() - 60 * 1000); // 1 minute ago
		(blueBot as any).blueMurderTimestamp = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago

		// Make sure getBotPattern returns the right pattern for this test
		(getBotPattern as jest.Mock).mockImplementation((bot, type) => {
			if (bot === 'Blue' && type === 'Mean') return /blue sucks/i;
			return null;
		});

		await blueBot.handleMessage(message);

		expect(blueBot.sendReply).toHaveBeenCalled();
	});
});
