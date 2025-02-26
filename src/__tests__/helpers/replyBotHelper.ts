import { TextChannel } from 'discord.js';
import ReplyBot from '../../starbunk/bots/replyBot';
import { createMockWebhookService } from '../mocks/serviceMocks';

// Helper function to patch any reply bot instance for testing
export function patchReplyBot(bot: ReplyBot, mockWebhookService: ReturnType<typeof createMockWebhookService>): void {
	// Mock the sendReply method on this specific instance
	jest.spyOn(bot, 'sendReply').mockImplementation((channel: TextChannel, response: string) => {
		mockWebhookService.writeMessage(channel, {
			username: bot.getBotName(),
			avatarURL: bot.getAvatarUrl(),
			content: response,
			embeds: []
		});
		return Promise.resolve();
	});
}
