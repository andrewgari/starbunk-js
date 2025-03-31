import { createStrategyBot } from '../../core/bot-builder';
import { chadRandomTrigger } from './triggers';

// Create the Chad Bot with just random trigger
export default createStrategyBot({
	name: 'Chad Bot',
	description: 'Randomly asks what someone is yapping about',
	defaultIdentity: {
		botName: 'Chad',
		avatarUrl: '' // Will be overridden by dynamic identity
	},
	// We don't want to skip bot messages to allow Chad to react to other bots
	skipBotMessages: true,
	// All triggers with their priorities
	triggers: [chadRandomTrigger]
});
