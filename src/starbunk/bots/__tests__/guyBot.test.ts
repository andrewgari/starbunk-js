// Mock the getCurrentMemberIdentity function
jest.mock('../../../discord/discordGuildMemberHelper', () => ({
	getCurrentMemberIdentity: jest.fn().mockResolvedValue({
		userId: "123456",
		avatarUrl: 'https://example.com/custom-guy.jpg',
		botName: 'Custom Guy'
	})
}));

import { Message } from 'discord.js';
import userId from '../../../discord/userId';
import { container, ServiceId } from '../../../services/container';
import { percentChance } from '../../../utils/random';
import { GuyBotConfig } from '../config/guyBotConfig';
import GuyBot from '../reply-bots/guyBot';
import { createMockMessage, mockDiscordService, mockLogger, mockWebhookService } from './testUtils';

// Mock DiscordService
jest.mock('../../../services/discordService', () => ({
	DiscordService: {
		getInstance: jest.fn().mockImplementation(() => mockDiscordService)
	}
}));

jest.mock('../../../utils/random', () => ({
	percentChance: jest.fn()
}));

describe('GuyBot', () => {
	let bot: GuyBot;
	let mockMsg: Message;
	let sendReplySpy: jest.SpyInstance;

	beforeEach(() => {
		jest.clearAllMocks();
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);

		mockDiscordService.getMemberAsBotIdentity.mockReturnValue({
			botName: GuyBotConfig.Name,
			avatarUrl: GuyBotConfig.Avatars.Default
		});

		mockMsg = createMockMessage();
		bot = new GuyBot();
		sendReplySpy = jest.spyOn(bot as any, 'sendReply').mockImplementation(() => Promise.resolve());
	});

	it('should have 15% response rate for Guy\'s messages', () => {
		expect(bot['responseRate']).toBe(15);
	});

	describe('when message contains "guy"', () => {
		beforeEach(() => {
			mockMsg.content = 'hey guy what is up';
		});

		it('should always respond regardless of probability', async () => {
			(percentChance as jest.Mock).mockReturnValue(false);
			await bot.handleMessage(mockMsg);
			expect(sendReplySpy).toHaveBeenCalled();
			expect(percentChance).not.toHaveBeenCalled();
		});

		it('should respond even if from non-Guy user', async () => {
			mockMsg.author.id = 'other-user';
			await bot.handleMessage(mockMsg);
			expect(sendReplySpy).toHaveBeenCalled();
		});
	});

	describe('when message is from Guy', () => {
		beforeEach(() => {
			mockMsg.author.id = userId.Guy;
			mockMsg.content = 'normal message';
		});

		it('should respond when probability check passes', async () => {
			(percentChance as jest.Mock).mockReturnValue(true);
			await bot.handleMessage(mockMsg);

			expect(percentChance).toHaveBeenCalledWith(15);
			expect(sendReplySpy).toHaveBeenCalled();
		});

		it('should not respond when probability check fails', async () => {
			(percentChance as jest.Mock).mockReturnValue(false);
			await bot.handleMessage(mockMsg);

			expect(percentChance).toHaveBeenCalledWith(15);
			expect(sendReplySpy).not.toHaveBeenCalled();
		});
	});

	describe('when message is from other users', () => {
		beforeEach(() => {
			mockMsg.author.id = 'other-user';
			mockMsg.content = 'normal message';
		});

		it('should never respond', async () => {
			(percentChance as jest.Mock).mockReturnValue(true);
			await bot.handleMessage(mockMsg);

			expect(percentChance).not.toHaveBeenCalled();
			expect(sendReplySpy).not.toHaveBeenCalled();
		});
	});

	it('should retrieve the correct bot identity', () => {
		expect(bot.botIdentity).toEqual({
			botName: GuyBotConfig.Name,
			avatarUrl: GuyBotConfig.Avatars.Default
		});
	});
	// it('should handle missing bot identity', () => {
	// 	mockDiscordService.getMemberAsBotIdentity.mockReturnValueOnce(undefined);
	// 	expect(bot.botIdentity).toBeUndefined();
	// });
});
