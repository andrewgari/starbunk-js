import { BotFactory } from '../../core/bot-factory';
import { chadKeywordTrigger } from './triggers';

// Create the Chad Bot with dynamic identity resolution
export default BotFactory.createBot({
	name: 'Chad Bot',
	description: 'Responds to mentions of gym, protein, and other chad topics',
	defaultIdentity: {
		botName: 'Chad',
		avatarUrl: '', // Will be overridden by dynamic identity
	},
	// Always process messages since we handle chance in the trigger
	defaultResponseRate: 100,
	// All triggers with their priorities
	triggers: [chadKeywordTrigger],
});
