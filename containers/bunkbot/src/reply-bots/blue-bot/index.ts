import { BotFactory } from '../../core/bot-factory';
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
export default BotFactory.createBot({
	name: 'BlueBot',
	description: 'Responds when someone says "blu?"',
	// Legacy fallback identity
	defaultIdentity: {
		botName: BLUE_BOT_NAME,
		avatarUrl: BLUE_BOT_AVATARS.Default
	},
	// New identity configuration system - Static Identity Bot
	identityConfig: {
		type: 'static',
		identity: {
			botName: BLUE_BOT_NAME,
			avatarUrl: BLUE_BOT_AVATARS.Default
		}
	},
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
