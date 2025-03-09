import userId from '../../../discord/userId';
import { getWebhookService } from '../../../services/bootstrap';
import { logger } from '../../../services/logger';
import { MacaroniBotConfig } from '../config/macaroniBotConfig';
import MacaroniBot from '../reply-bots/macaroniBot';
import { MockWebhookService, createMockMessage } from './testUtils';

jest.mock('../../../services/bootstrap');
jest.mock('../../../services/logger');

describe('MacaroniBot', () => {
	let macaroniBot: MacaroniBot;
	let mockWebhookService: MockWebhookService;

	beforeEach(() => {
		mockWebhookService = new MockWebhookService();
		(getWebhookService as jest.Mock).mockReturnValue(mockWebhookService);
		macaroniBot = new MacaroniBot();
		jest.clearAllMocks();
	});

	it('should respond to messages containing "macaroni"', () => {
		const expectedResponse = `Are you trying to reach <@${userId.Venn}>`;
		const message = createMockMessage('macaroni');

		macaroniBot.handleMessage(message);

		expect(logger.debug).toHaveBeenCalledWith(
			expect.stringContaining('MacaroniBot responding to message: macaroni')
		);
		expect(message.reply).toHaveBeenCalledWith('🧀 Macaroni and cheese is the best! 🧀');
	});

	it('should respond to messages containing "macaroni" in any case', () => {
		const expectedResponse = `Are you trying to reach <@${userId.Venn}>`;
		const message = createMockMessage('MACARONI');

		macaroniBot.handleMessage(message);

		const matches = message.content.match(MacaroniBotConfig.Patterns.Macaroni);
		expect(matches).toBeTruthy();
		expect(message.reply).toHaveBeenCalledWith('🧀 Macaroni and cheese is the best! 🧀');
	});

	it('should not respond to messages without "macaroni"', () => {
		const message = createMockMessage('hello world');

		macaroniBot.handleMessage(message);

		expect(message.reply).not.toHaveBeenCalled();
	});

	it('should not respond to bot messages', () => {
		const message = createMockMessage('macaroni', undefined, true);

		macaroniBot.handleMessage(message);

		expect(message.reply).not.toHaveBeenCalled();
	});

	it('should log debug message when responding', () => {
		const message = createMockMessage('macaroni');

		macaroniBot.handleMessage(message);

		expect(logger.debug).toHaveBeenCalledWith(
			'MacaroniBot responding to message: macaroni'
		);
	});
});
