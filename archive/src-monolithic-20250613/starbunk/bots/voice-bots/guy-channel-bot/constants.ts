export const GUY_CHANNEL_BOT_NAME = 'GuyChannelBot';
export const GUY_CHANNEL_BOT_DESCRIPTION = 'Enforces channel access rules by redirecting users from restricted channels';
export const GUY_CHANNEL_BOT_AVATAR_URL = 'https://i.imgur.com/YPFGEzM.png'; // Replace with actual avatar URL

export const GUY_CHANNEL_PATTERNS = {
	GuyChannel: /guy/i
} as const;

// Constants for Guy Bot
export const GUY_TRIGGER_CHANCE = 1; // 1% chance to respond
export const GUY_RESPONSE = 'Heh...';
