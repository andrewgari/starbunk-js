import { logger } from '../../../../services/logger';
import { getPersonalityService } from '../../../../services/personalityService';
import { createStrategyBot } from '../../core/bot-builder';
import { COVA_BOT_AVATARS, COVA_BOT_CONFIG, COVA_BOT_NAME } from './constants';
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
		const embedding = await personalityService.loadPersonalityEmbedding('personality.npy', 'covaBot');
		
		if (!embedding) {
			// Try fallback to JSON format
			logger.info('[CovaBot] NPY personality embedding not found, trying JSON format...');
			const jsonEmbedding = await personalityService.loadPersonalityEmbedding('personality.json', 'covaBot');
			
			if (!jsonEmbedding) {
				logger.warn('[CovaBot] No personality embedding files found. Using default behavior.');
				
				// Generate a new embedding from the prompt if none exists
				logger.info('[CovaBot] Attempting to generate new personality embedding from prompt...');
				const promptText = require('./constants').COVA_BOT_PROMPTS.EmulatorPrompt;
				
				if (promptText) {
					const newEmbedding = await personalityService.generatePersonalityEmbedding(
						promptText,
						'personality.json',
						'covaBot'
					);
					
					if (newEmbedding) {
						logger.info('[CovaBot] Successfully generated and saved new personality embedding');
					} else {
						logger.warn('[CovaBot] Failed to generate new personality embedding, continuing with default behavior');
					}
				}
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
	// Use the response rate from the config
	responseRate: COVA_BOT_CONFIG.ResponseRate,
	triggers: [
		covaStatsCommandTrigger,
		covaDirectMentionTrigger,
		covaMentionTrigger,
		covaContextualTrigger,
		covaConversationTrigger
	]
});
