import ReplyBot from '../../starbunk/bots/replyBot';
import { createMockWebhookService } from '../mocks/serviceMocks';

// Helper function to patch any reply bot instance for testing
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function patchReplyBot(_bot: ReplyBot, _mockWebhookService: ReturnType<typeof createMockWebhookService>): void {
	// This function is now a no-op, but we keep it for backward compatibility
	// We're using the parameters to avoid TypeScript errors
	// Logging removed to fix linting error: Bot name and webhook service status would be logged here
}
