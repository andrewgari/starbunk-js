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
		// Try to load NPY file first, fall back to JSON if not found
		const embedding = await personalityService.loadPersonalityEmbedding('personality.npy');
		
		if (!embedding) {
			// Try fallback to JSON format
			logger.info('[CovaBot] NPY personality embedding not found, trying JSON format...');
			const jsonEmbedding = await personalityService.loadPersonalityEmbedding('personality.json');
			
			if (!jsonEmbedding) {
				logger.warn('[CovaBot] No personality embedding files found. Using default behavior.');
				// Don't throw error, just continue with default behavior
			} else {
				logger.info('[CovaBot] JSON personality embedding loaded successfully');
			}
		} else {
			logger.info('[CovaBot] NPY personality embedding loaded successfully');
		}
	} catch (error) {
		logger.error(`[CovaBot] Error during personality initialization: ${error instanceof Error ? error.message : String(error)}`);
		logger.warn('[CovaBot] Continuing with default behavior due to embedding initialization error');
		// Don't throw error, continue with default behavior
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
