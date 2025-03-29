import { logger } from '../../../../services/logger';
import { getPersonalityService } from '../../../../services/personalityService';
import { createStrategyBot } from '../../core/bot-builder';
import { COVA_BOT_AVATARS, COVA_BOT_NAME } from './constants';
import {
	covaContextualTrigger,
	covaConversationTrigger,
	covaDirectMentionTrigger,
	covaMentionTrigger,
	covaStatsCommandTrigger
} from './llm-triggers';

// Export initialization function
export async function initializeCovaBot(): Promise<void> {
	try {
		const personalityService = getPersonalityService();
		await personalityService.loadPersonalityEmbedding('personality.npy');
		logger.info('[CovaBot] Personality embedding loaded successfully');
	} catch (error) {
		logger.error(`[CovaBot] Failed to load personality embedding: ${error instanceof Error ? error.message : String(error)}`);
		throw error;
	}
}

// Create and export the bot instance
export default createStrategyBot({
	name: COVA_BOT_NAME,
	description: 'A bot that responds to messages using AI',
	defaultIdentity: {
		botName: COVA_BOT_NAME,
		avatarUrl: COVA_BOT_AVATARS.Default
	},
	triggers: [
		covaStatsCommandTrigger,
		covaDirectMentionTrigger,
		covaMentionTrigger,
		covaContextualTrigger,
		covaConversationTrigger
	]
});
