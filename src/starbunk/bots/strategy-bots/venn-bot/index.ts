import { createStrategyBot } from '../../core/bot-builder';
import { VENN_AVATAR_URL, VENN_BOT_NAME } from './constants';
import { cringeTrigger, randomVennTrigger } from './triggers';

// Create the Venn Bot with cringe detection and random responses
export default createStrategyBot({
	name: 'VennBot',
	description: 'Responds to cringe messages and randomly to Venn with cringe responses',
	defaultIdentity: {
		botName: VENN_BOT_NAME,
		avatarUrl: VENN_AVATAR_URL
	},
	// Skip bot messages to avoid loops
	skipBotMessages: true,
	// Ordered by priority (higher number = higher priority)
	triggers: [cringeTrigger, randomVennTrigger]
});
