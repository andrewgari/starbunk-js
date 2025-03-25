import { Message } from 'discord.js';
import { BlueBotConfig } from '../config/blueBotConfig';
import BlueBot from '../reply-bots/blueBot';
import { createMockMessage } from './testUtils';

// Mock the LLM Manager
const mockLLMManager = {
	createCompletion: jest.fn().mockResolvedValue({ content: 'YES' }),
	createSimpleCompletion: jest.fn().mockResolvedValue('yes')
};

// Mock the bootstrap module
jest.mock('../../../services/bootstrap', () => ({
	getLLMManager: jest.fn().mockReturnValue(mockLLMManager)
}));

jest.mock('../../../environment', () => ({
	isDebugMode: jest.fn().mockReturnValue(false)
}));

describe('BlueBot', () => {
	let blueBot: BlueBot;
	let message: Message;
	let sendReplySpy: jest.SpyInstance;
	let handleBluResponseSpy: jest.SpyInstance;
	let handleBluMentionSpy: jest.SpyInstance;

	beforeEach(() => {
		jest.clearAllMocks();

		// Create a mock message
		message = createMockMessage('Hello there!');
		message.reference = null;

		// Create BlueBot instance
		blueBot = new BlueBot();

		// Spy on the sendReply method
		sendReplySpy = jest.spyOn(blueBot as any, 'sendReply').mockResolvedValue(undefined);

		// Spy on handlers
		handleBluResponseSpy = jest.spyOn(blueBot as any, 'handleBluResponse').mockResolvedValue(undefined);
		handleBluMentionSpy = jest.spyOn(blueBot as any, 'handleBluMention').mockResolvedValue(undefined);
	});

	it('should respond to direct blue references', async () => {
		const message = mockMessage('blue is my favorite color');
		await blueBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				botName: BlueBotConfig.Name,
				content: BlueBotConfig.Responses.Default
			})
		);
	});

	it('should respond when AI detects a blue reference', async () => {
		const message = mockMessage('The sky is looking nice today');
		await blueBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				botName: BlueBotConfig.Name,
				content: BlueBotConfig.Responses.Default
			})
		);
	});
});
