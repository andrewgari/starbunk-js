// Mock the webhook service
jest.mock('../../../webhooks/webhookService');

// Mock the bot constants
const mockGetCurrentMemberIdentity = jest.fn().mockResolvedValue({
	userId: 'user123',
	avatarUrl: 'http://example.com/custom-sig.jpg',
	botName: 'CustomSigGreatBot',
});

jest.mock('../botConstants', () => ({
	getBotName: jest.fn().mockReturnValue('SigGreatBot'),
	getBotAvatar: jest.fn().mockReturnValue('http://example.com/siggreat.jpg'),
	getBotPattern: jest.fn().mockReturnValue(/\bsig\b.*\bgreat\b/i),
	getBotResponse: jest.fn().mockReturnValue('Sig is great!'),
	getCurrentMemberIdentity: jest.fn().mockImplementation(() => mockGetCurrentMemberIdentity()),
}));

import webhookService from '../../../webhooks/webhookService';
import SigGreatBot from '../reply-bots/sigGreatBot';
import { mockMessage } from './testUtils';

// Set up the mock implementation
// The setupBotMocks() function in testUtils now handles this

describe('SigGreatBot', () => {
	let sigGreatBot: SigGreatBot;

	beforeEach(() => {
		jest.clearAllMocks();
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

		// Act
		await sigGreatBot.handleMessage(message);

		// Assert
		expect(webhookService.writeMessage).toHaveBeenCalled();
	});
});
