import { createVoiceBot } from '../../core/voice-bot-builder';
import {
	GUY_CHANNEL_BOT_AVATAR_URL,
	GUY_CHANNEL_BOT_DESCRIPTION,
	GUY_CHANNEL_BOT_NAME
} from './constants';
import { guyChannelTrigger } from './triggers';

// Create the Guy Channel Bot that enforces channel access rules
export default createVoiceBot({
	name: GUY_CHANNEL_BOT_NAME,
	description: GUY_CHANNEL_BOT_DESCRIPTION,
	defaultIdentity: {
		botName: GUY_CHANNEL_BOT_NAME,
		avatarUrl: GUY_CHANNEL_BOT_AVATAR_URL
	},
	triggers: [guyChannelTrigger]
});
