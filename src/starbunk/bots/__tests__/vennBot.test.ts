// Mock the getCurrentMemberIdentity function
jest.mock('../../../discord/discordGuildMemberHelper', () => ({
	getCurrentMemberIdentity: jest.fn().mockResolvedValue({
		avatarUrl: 'https://i.imgur.com/1234567890.png'
	})
}));

import { Message } from 'discord.js';
import userId from '../../../discord/userId';
import { container, ServiceId } from '../../../services/container';
import { percentChance } from '../../../utils/random';
import VennBot from '../reply-bots/vennBot';
import { createMockMessage, mockDiscordService, mockLogger, mockWebhookService } from './testUtils';

// Mock DiscordService
jest.mock('../../../services/discordService', () => {
	return {
		DiscordService: {
			getInstance: jest.fn().mockImplementation(() => mockDiscordService)
		}
	};
});

jest.mock('../../../utils/random', () => ({
	percentChance: jest.fn()
}));

jest.mock('../../../environment', () => ({
	isDebugMode: jest.fn().mockReturnValue(false)
}));

describe('VennBot', () => {
	let bot: VennBot;
	let mockMsg: Message;
	let sendReplySpy: jest.SpyInstance;

	beforeEach(() => {
		jest.clearAllMocks();
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);

		mockMsg = createMockMessage();
		bot = new VennBot();
		sendReplySpy = jest.spyOn(bot as any, 'sendReply').mockImplementation(() => Promise.resolve());
	});

	it('should have 5% response rate', () => {
		expect(bot['responseRate']).toBe(5);
	});

	it('should respond to cringe messages regardless of probability', async () => {
		(percentChance as jest.Mock).mockReturnValue(false);
		mockMsg.content = 'venn is cringe';
		await bot.handleMessage(mockMsg);

		expect(sendReplySpy).toHaveBeenCalled();
	});

	it('should respond to target user when probability check passes', async () => {
		(percentChance as jest.Mock).mockReturnValue(true);
		mockMsg.author.id = userId.Venn;
		await bot.handleMessage(mockMsg);

		expect(percentChance).toHaveBeenCalledWith(5);
		expect(sendReplySpy).toHaveBeenCalled();
	});

	it('should not respond to target user when probability check fails', async () => {
		(percentChance as jest.Mock).mockReturnValue(false);
		mockMsg.author.id = userId.Venn;
		await bot.handleMessage(mockMsg);

		expect(percentChance).toHaveBeenCalledWith(5);
		expect(sendReplySpy).not.toHaveBeenCalled();
	});

	it('should not respond to non-target users without cringe', async () => {
		(percentChance as jest.Mock).mockReturnValue(true);
		mockMsg.author.id = 'other-user';
		mockMsg.content = 'normal message';
		await bot.handleMessage(mockMsg);

		expect(sendReplySpy).not.toHaveBeenCalled();
	});
});
