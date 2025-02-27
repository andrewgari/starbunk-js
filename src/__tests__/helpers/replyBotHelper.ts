import ReplyBot from '../../starbunk/bots/replyBot';
import { createMockWebhookService } from '../mocks/serviceMocks';

/**
 * Helper function to patch any reply bot instance for testing
 * This function is now a no-op, but we keep it for backward compatibility
 * The parameters are intentionally unused but kept to maintain the function signature
 * for any existing code that might call this function
 */
export function patchReplyBot(
	/* eslint-disable @typescript-eslint/no-unused-vars */
	_bot: ReplyBot,
	_mockWebhookService: ReturnType<typeof createMockWebhookService>
	/* eslint-enable @typescript-eslint/no-unused-vars */
): void {
	// This function is intentionally empty
}
