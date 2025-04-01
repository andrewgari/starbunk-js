import { createStrategyBot } from '../../core/bot-builder';
import { chadKeywordTrigger } from './triggers';

// Create the Chad Bot with keyword trigger
export default createStrategyBot({
	name: 'Chad Bot',
	description: 'Responds to mentions of gym, protein, and other chad topics',
	defaultIdentity: {
		botName: 'Chad',
		avatarUrl: 'https://i.imgur.com/XFDYZYz.png'
	},
	// We don't want Chad to respond to other bots
	skipBotMessages: true,
	// All triggers with their priorities
	triggers: [chadKeywordTrigger]
});
