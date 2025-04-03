import userId from '../../../discord/userId';
import { container } from '../../../services/container';
import chadBot from '../strategy-bots/chad-bot';
import { CHAD_BOT_AVATAR_URL, CHAD_BOT_NAME, CHAD_RESPONSE, CHAD_RESPONSE_CHANCE } from '../strategy-bots/chad-bot/constants';
import { mockMessage, mockWebhookService, setupBotTest } from "../test-utils/testUtils";

describe('Chad Bot Strategy', () => {
	beforeEach(() => {
		// Clear mocks and reset container
		setupBotTest(container, {
			botName: CHAD_BOT_NAME,
			avatarUrl: CHAD_BOT_AVATAR_URL
		});
	});

	it('should never respond to messages from Chad user', async () => {
		const message = mockMessage('Hello everyone');
		message.author.id = userId.Chad;

		await chadBot.processMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should respond to messages with 10% chance', async () => {
		const mockRandom = jest.spyOn(Math, 'random').mockReturnValue(CHAD_RESPONSE_CHANCE - 0.01);

		const message = mockMessage('Any random message');
		await chadBot.processMessage(message);

		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				username: CHAD_BOT_NAME,
				content: CHAD_RESPONSE
			})
		);

		mockRandom.mockRestore();
	});

	it('should not respond to messages if random value is above threshold', async () => {
		const mockRandom = jest.spyOn(Math, 'random').mockReturnValue(CHAD_RESPONSE_CHANCE + 0.01);

		const message = mockMessage('Any random message');
		await chadBot.processMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();

		mockRandom.mockRestore();
	});
});
