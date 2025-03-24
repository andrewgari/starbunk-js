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

	it('should initialize with the correct bot identity', () => {
		expect(blueBot.botIdentity.botName).toBe(BlueBotConfig.Name);
		expect(blueBot.botIdentity.avatarUrl).toBe(BlueBotConfig.Avatars.Default);
	});

	it('should respond to messages containing blue', async () => {
		message.content = 'I like the color blue';
		jest.spyOn(BlueBotConfig.Patterns.Default, 'test').mockReturnValue(true);

		await blueBot.processMessage(message);

		expect(handleBluMentionSpy).toHaveBeenCalled();
	});

	it('should respond to replies to BlueBot messages', async () => {
		// Set up message as a reply to BlueBot
		message.reference = {
			messageId: '123456789',
			guildId: '987654321',
			channelId: '123123123',
			type: 0
		};

		message.channel.messages.cache.set('123456789', {
			author: {
				id: message.client.user?.id // This is the same as blueBot's ID
			}
		} as any);

		await blueBot.processMessage(message);

		expect(handleBluResponseSpy).toHaveBeenCalled();
	});

	it('should not respond to replies to other bots', async () => {
		// Set up message as a reply to another bot
		message.reference = {
			messageId: '123456789',
			guildId: '987654321',
			channelId: '123123123',
			type: 0
		};

		message.channel.messages.cache.set('123456789', {
			author: {
				id: 'some-other-bot-id'
			}
		} as any);

		await blueBot.processMessage(message);

		expect(handleBluResponseSpy).not.toHaveBeenCalled();
		expect(handleBluMentionSpy).not.toHaveBeenCalled();
	});

	it('should detect that someone is asking to be blue', async () => {
		message.content = 'bluebot, say something nice about me';
		jest.spyOn(BlueBotConfig.Patterns.Nice, 'test').mockReturnValue(true);

		await blueBot.processMessage(message);

		expect(sendReplySpy).toHaveBeenCalled();
	});
});
