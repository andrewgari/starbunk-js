import { createStrategyBot } from '../../core/bot-builder';
import { BLUE_BOT_AVATARS, BLUE_BOT_NAME } from './constants';
import {
	triggerBlueBotAcknowledgeOther,
	triggerBlueBotAcknowledgeVennMean,
	triggerBlueBotLlmDetection,
	triggerBlueBotMention,
	triggerBlueBotNice,
	triggerBlueBotNiceVenn
} from './triggers';

// Create the Blue Bot with all its triggers
export default createStrategyBot({
	name: 'BlueBot',
	description: 'Responds when someone says "blu?"',
	defaultIdentity: {
		botName: BLUE_BOT_NAME,
		avatarUrl: BLUE_BOT_AVATARS.Default
	},
	skipBotMessages: true,
	triggers: [
		// Order matters for processing, but priority is also considered
		triggerBlueBotNiceVenn,            // Priority 1
		triggerBlueBotNice,                // Priority 2
		triggerBlueBotAcknowledgeVennMean, // Priority 3
		triggerBlueBotAcknowledgeOther,    // Priority 4
		triggerBlueBotMention,             // Priority 5
		triggerBlueBotLlmDetection         // Priority 6
	]
});
