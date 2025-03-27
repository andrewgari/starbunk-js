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

// Initialize personality embedding
(async () => {
	try {
		const personalityService = getPersonalityService();
		await personalityService.loadPersonalityEmbedding('personality.npy');
		logger.info('[CovaBot] Personality embedding loaded successfully');
	} catch (error) {
		logger.error(`[CovaBot] Failed to load personality embedding: ${error instanceof Error ? error.message : String(error)}`);
	}
})();

// Create the Cova Bot with all its triggers
export default createStrategyBot({
	name: 'CovaBot',
	description: 'CovaDax LLM-powered emulation bot',
	defaultIdentity: {
		botName: COVA_BOT_NAME,
		avatarUrl: COVA_BOT_AVATARS.Default
	},
	skipBotMessages: true,
	triggers: [
		// Order matters for processing, but priority is also considered
		covaStatsCommandTrigger,  // Special command - highest priority
		covaDirectMentionTrigger, // Direct @ mentions - highest normal priority
		covaContextualTrigger,    // Contextual mentions with LLM decision
		covaMentionTrigger,       // Regular mentions of 'cova'
		covaConversationTrigger   // Continued conversation - lowest priority
	]
});
