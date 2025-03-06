// Mock the webhook service
jest.mock('../../../webhooks/webhookService');

// Mock getCurrentMemberIdentity and other functions
jest.mock('../botConstants', () => ({
	getBotName: jest.fn().mockReturnValue('SigGreatBot'),
	getBotAvatar: jest.fn().mockReturnValue('http://example.com/siggreat.jpg'),
	getBotPattern: jest.fn().mockReturnValue(/\bsig.*great\b/i),
	getBotResponse: jest.fn().mockReturnValue('Sig is great!'),
	getCurrentMemberIdentity: jest.fn().mockResolvedValue({
		avatarUrl: 'http://example.com/custom-siggreat.jpg',
		botName: 'CustomSigGreatBot'
	})
}));

// Mock the random utility
jest.mock('../../../utils/random', () => ({
	percentChance: jest.fn().mockReturnValue(true),
}));


import webhookService from '../../../webhooks/webhookService';
import SigGreatBot from '../reply-bots/sigGreatBot';
import { mockMessage, setupTestContainer } from './testUtils';
import { getBotPattern, getCurrentMemberIdentity, getBotResponse } from '../botConstants';

describe('SigGreatBot', () => {
	let sigGreatBot: SigGreatBot;

	beforeEach(() => {
		jest.clearAllMocks();
		// Set up container with mock services
		setupTestContainer();
		// Create bot after setting up container
		sigGreatBot = new SigGreatBot();
	});

	test('should not respond to bot messages', async () => {
		// Arrange
		const botMessage = mockMessage('sig is great');
		botMessage.author.bot = true;

		// Act
		await sigGreatBot.handleMessage(botMessage);

		// Assert
		expect(webhookService.writeMessage).not.toHaveBeenCalled();
	});

	test('should respond to messages containing "sig" and "great"', async () => {
		// Arrange
		const message = mockMessage('sig is great');
		(getBotPattern as jest.Mock).mockReturnValueOnce(/sig.*great/i);
		(getCurrentMemberIdentity as jest.Mock).mockResolvedValueOnce({
			avatarUrl: 'http://example.com/custom-sig.jpg',
			botName: 'CustomSigBot'
		});

		// Act
		await sigGreatBot.handleMessage(message);

		// Assert
		expect(getBotResponse).toHaveBeenCalledWith('SigGreat', 'Default');
		expect(webhookService.writeMessage).toHaveBeenCalled();
	});

	test('should not respond if identity is not found', async () => {
		// Arrange
		const message = mockMessage('sig is great');
		(getBotPattern as jest.Mock).mockReturnValueOnce(/sig.*great/i);
		(getCurrentMemberIdentity as jest.Mock).mockResolvedValueOnce(null);

		// Act
		await sigGreatBot.handleMessage(message);

		// Assert
		expect(webhookService.writeMessage).not.toHaveBeenCalled();
	});
});
