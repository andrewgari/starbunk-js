import { TextChannel } from 'discord.js';
import ReplyBot from '../../starbunk/bots/replyBot';
import { createMockWebhookService } from '../mocks/serviceMocks';

// Helper function to patch any reply bot instance for testing
export function patchReplyBot(bot: ReplyBot, mockWebhookService: ReturnType<typeof createMockWebhookService>): void {
	// Mock the sendReply method on this specific instance
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(jest.spyOn(bot as any, 'sendReply') as any).mockImplementation((channel: TextChannel, response: string) => {
		// Get the bot's identity from the test class
		const identity = bot.getIdentity();
		const botName = identity.name;
		const avatarURL = identity.avatarUrl || '';

		mockWebhookService.writeMessage(channel, {
			username: botName,
			avatarURL: avatarURL,
			content: response,
			embeds: []
		});
		return Promise.resolve();
	});
}
