import { createStrategyBot } from '../../core/bot-builder';
import { BLUE_BOT_AVATARS, BLUE_BOT_NAME } from './constants';
import { 
	blueConfirmTrigger, 
	blueStandardTrigger, 
	blueMurderTrigger, 
	blueNiceTrigger 
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
		blueMurderTrigger,  // Highest priority
		blueNiceTrigger,    // Next priority  
		blueConfirmTrigger, // Next priority
		blueStandardTrigger  // Lowest priority
	]
});