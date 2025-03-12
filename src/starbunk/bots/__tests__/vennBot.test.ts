// Mock the getCurrentMemberIdentity function
jest.mock('../../../discord/discordGuildMemberHelper', () => ({
	getCurrentMemberIdentity: jest.fn().mockResolvedValue({
		avatarUrl: 'https://i.imgur.com/1234567890.png'
	})
}));

import { container, ServiceId } from '../../../services/services';
import { VennBotConfig } from '../config/vennBotConfig';
import VennBot from '../reply-bots/vennBot';
import { mockLogger, mockMessage, mockWebhookService } from './testUtils';

describe('VennBot', () => {
	let vennBot: VennBot;

	beforeEach(() => {
		// Clear container and register mocks
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);

		// Create VennBot instance
		vennBot = new VennBot();
	});

	it('should respond to messages containing "venn"', async () => {
		const message = mockMessage('venn is awesome');
		await vennBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				username: VennBotConfig.Name,
				content: expect.any(String)
			})
		);
	});

	it('should not respond to bot messages', async () => {
		const message = mockMessage('venn', undefined, true);
		await vennBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should not respond to messages without "venn"', async () => {
		const message = mockMessage('hello world');
		await vennBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});
