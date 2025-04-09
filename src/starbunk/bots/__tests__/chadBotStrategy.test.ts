import userId from '../../../discord/userId';
import { container } from '../../../services/container';
import chadBot from '@/starbunk/bots/reply-bots/chad-bot';
import { CHAD_BOT_AVATAR_URL, CHAD_BOT_NAME, CHAD_RESPONSE } from '@/starbunk/bots/reply-bots/chad-bot/constants';
import { mockDiscordService, mockMessage, setupBotTest } from '../test-utils/testUtils';

describe('Chad Bot Strategy', () => {
	const originalRandom = global.Math.random;

	beforeEach(() => {
		// Clear mocks and reset container
		setupBotTest(container, {
			botName: CHAD_BOT_NAME,
			avatarUrl: CHAD_BOT_AVATAR_URL,
		});

		// Reset all mocks
		jest.clearAllMocks();
	});

	afterEach(() => {
		global.Math.random = originalRandom;
	});

	it('should never respond to messages from Chad user', async () => {
		const message = mockMessage('Hello everyone');
		message.author.id = userId.Chad;

		await chadBot.processMessage(message);

		expect(mockDiscordService.sendMessageWithBotIdentity).not.toHaveBeenCalled();
	});

	it('should respond to messages with 1% chance', async () => {
		global.Math.random = jest.fn().mockReturnValue(0.001); // Less than 1%

		const message = mockMessage('Any random message');
		await chadBot.processMessage(message);

		expect(mockDiscordService.sendMessageWithBotIdentity).toHaveBeenCalledWith(
			message.channel.id,
			expect.objectContaining({
				botName: CHAD_BOT_NAME,
				avatarUrl: CHAD_BOT_AVATAR_URL,
			}),
			CHAD_RESPONSE,
		);
	});

	it('should not respond to messages the other 99% of the time', async () => {
		global.Math.random = jest.fn().mockReturnValue(0.5); // Greater than 1%

		const message = mockMessage('Any random message');
		await chadBot.processMessage(message);

		expect(mockDiscordService.sendMessageWithBotIdentity).not.toHaveBeenCalled();
	});
});
