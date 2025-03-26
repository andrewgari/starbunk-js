import { createStrategyBot } from '../../core/bot-builder';
import { COVA_BOT_AVATARS, COVA_BOT_NAME } from './constants';
import {
	covaContextualTrigger,
	covaConversationTrigger,
	covaDirectMentionTrigger,
	covaMentionTrigger,
	covaStatsCommandTrigger
} from './llm-triggers';

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
