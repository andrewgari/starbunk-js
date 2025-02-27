import ReplyBot from '../../starbunk/bots/replyBot';
import { createMockWebhookService } from '../mocks/serviceMocks';

// Helper function to patch any reply bot instance for testing
export function patchReplyBot(bot: ReplyBot, mockWebhookService: ReturnType<typeof createMockWebhookService>): void {
	// This function is now a no-op, but we keep it for backward compatibility
	// We're using the parameters to avoid TypeScript errors
	console.log(`Patching ${bot.getBotName()} with mock webhook service: ${mockWebhookService ? 'provided' : 'not provided'}`);
}
