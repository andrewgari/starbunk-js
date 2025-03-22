// Mock the getCurrentMemberIdentity function
jest.mock('../../../discord/discordGuildMemberHelper', () => ({
	getCurrentMemberIdentity: jest.fn().mockResolvedValue({
		userId: "123456",
		avatarUrl: 'https://example.com/custom-guy.jpg',
		botName: 'Custom Guy'
	})
}));

import { Message } from 'discord.js';
import { container, ServiceId } from '../../../services/container';
import random from '../../../utils/random';
import { GuyBotConfig } from '../config/guyBotConfig';
import GuyBot from '../reply-bots/guyBot';
import { createMockMessage, mockDiscordService, mockLogger, mockWebhookService } from './testUtils';

// Mock DiscordService
jest.mock('../../../services/discordService', () => ({
	DiscordService: {
		getInstance: jest.fn().mockImplementation(() => mockDiscordService)
	}
}));

describe('GuyBot', () => {
	let guyBot: GuyBot;
	let message: Message<boolean>;

	beforeEach(() => {
		jest.clearAllMocks();
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);

		mockDiscordService.getMemberAsBotIdentity.mockReturnValue({
			botName: GuyBotConfig.Name,
			avatarUrl: GuyBotConfig.Avatars.Default
		});

		guyBot = new GuyBot();
		message = createMockMessage('Hey guy, what\'s up?', '123456', false);
	});

	it('should trigger on "guy" mentions', async () => {
		message.content = 'Hey guy';
		await guyBot.handleMessage(message);
		expect(mockWebhookService.writeMessage).toHaveBeenCalled();
	});

	it('should trigger on guys messages 5% of the time', async () => {
		message.content = 'Hey guy';
		jest.spyOn(random, 'percentChance').mockReturnValue(true);
		await guyBot.handleMessage(message);
		expect(mockWebhookService.writeMessage).toHaveBeenCalled();
	});

	it('should not trigger on other messages', async () => {
		message.content = 'Hey';
		jest.spyOn(random, 'percentChance').mockReturnValue(false);
		await guyBot.handleMessage(message);
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should retrieve the correct bot identity', async () => {
		expect(guyBot.botIdentity).toEqual({
			botName: GuyBotConfig.Name,
			avatarUrl: GuyBotConfig.Avatars.Default
		});
	});
	// it('should handle missing bot identity', () => {
	// 	mockDiscordService.getMemberAsBotIdentity.mockReturnValueOnce(undefined);
	// 	expect(guyBot.botIdentity).toBeUndefined();
	// });
});
